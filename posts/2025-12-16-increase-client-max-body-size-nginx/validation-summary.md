# Validation Summary: How to Increase client_max_body_size in Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx HTTP core module
- Nginx proxy module
- Nginx HTTP/2 module
- Node.js / Express
- Multer
- Python Flask
- Gunicorn
- PHP upload configuration
- curl, dd, systemctl, and nginx CLI commands

## Sources Consulted
- Nginx ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Express Multer middleware documentation: https://expressjs.com/en/resources/middleware/multer/
- Flask file upload documentation: https://flask.palletsprojects.com/en/stable/patterns/fileuploads/
- Gunicorn settings documentation: https://gunicorn.org/reference/settings/
- PHP core ini directive documentation: https://www.php.net/manual/en/ini.core.php
- PHP file upload common pitfalls documentation: https://www.php.net/manual/en/features.file-upload.common-pitfalls.php
- Local CLI help/version output for curl and GNU dd

## Issues Found
- Nginx timeout descriptions implied whole-upload duration limits. Updated wording and comments to clarify that Nginx `client_body_timeout`, `proxy_read_timeout`, and `proxy_send_timeout` are measured between successive I/O operations.
- `proxy_connect_timeout 300s` exceeded the practical limit noted in Nginx documentation. Changed examples to `75s` and noted the usual ceiling.
- Buffering comments mixed request-body buffering with proxied response buffering. Updated the section intro and comments so `proxy_request_buffering` is described as request buffering and `proxy_buffering` / proxy buffer directives are described as response buffering.
- `client_body_in_file_only off` was incorrectly commented as writing bodies to files when larger than the buffer. Updated the comment to reflect that `off` means Nginx does not always save the entire request body to a file.
- The access log used `$request_length` with the label `body_bytes`, but Nginx documents `$request_length` as request line, headers, and body combined. Renamed the log label to `request_length`.
- PHP configuration set `post_max_size` equal to `upload_max_filesize`. PHP documentation says `post_max_size` must be larger than `upload_max_filesize` for large uploads, so `post_max_size` was changed to `550M`.

## Review Notes
The post is technically relevant and the main `client_max_body_size` guidance is correct: the directive defaults to `1m`, supports `http`, `server`, and `location` contexts, returns 413 when exceeded, and accepts `0` to disable request body size checking. The HTTP/2 example uses the current `http2 on;` directive form introduced in Nginx 1.25.1.
