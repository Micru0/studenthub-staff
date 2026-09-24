import { TEMP_UPLOAD_HOST } from './temp-upload-session';

const SENSITIVE_QUERY_KEYS = ['x-amz-signature', 'x-amz-credential', 'x-amz-security-token'];

/**
 * Remove presigned credential material from a telemetry string.
 * The returned value is for Sentry only. Callers must keep using the original upload URL.
 */
export function redactPresignedUploadUrl(url: string): string {
    if (typeof url !== 'string' || url.indexOf(TEMP_UPLOAD_HOST) === -1) {
        return url;
    }

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch (err) {
        return url;
    }

    if (parsed.hostname !== TEMP_UPLOAD_HOST) {
        return url;
    }

    const sensitiveKeys = Array.from(parsed.searchParams.keys()).filter((key) => {
        return SENSITIVE_QUERY_KEYS.indexOf(key.toLowerCase()) !== -1;
    });
    if (sensitiveKeys.length === 0) {
        return url;
    }

    sensitiveKeys.forEach((key) => {
        parsed.searchParams.set(key, '[redacted]');
    });

    return parsed.toString();
}

/**
 * Breadcrumbs integration stores the XHR URL. TryCatch({ XMLHttpRequest: false })
 * does not stop that. Redact only presigned upload query values and keep method/status.
 */
export function redactPresignedUploadBreadcrumb(breadcrumb) {
    if (!breadcrumb) {
        return breadcrumb;
    }

    const data = breadcrumb.data ? { ...breadcrumb.data } : breadcrumb.data;
    let message = breadcrumb.message;
    let changed = false;

    if (data && typeof data.url === 'string') {
        const redactedUrl = redactPresignedUploadUrl(data.url);
        if (redactedUrl !== data.url) {
            data.url = redactedUrl;
            changed = true;
        }
    }

    if (typeof message === 'string') {
        const redactedMessage = redactPresignedUploadUrl(message);
        if (redactedMessage !== message) {
            message = redactedMessage;
            changed = true;
        }
    }

    if (!changed) {
        return breadcrumb;
    }

    return {
        ...breadcrumb,
        message,
        data
    };
}
