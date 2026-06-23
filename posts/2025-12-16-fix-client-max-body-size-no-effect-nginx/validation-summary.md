# Validation Summary: How to Fix 'client_max_body_size has no effect' in Nginx

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Nginx
- Nginx proxy module
- Nginx FastCGI module
- PHP-FPM / php.ini upload settings
- Node.js / Express
- Multer
- Django upload/request settings
- Spring Boot multipart upload settings
- curl
- Docker Compose
- Official nginx Docker image
- Cloudflare and AWS load balancer upload limits

## Sources Consulted
- Nginx `client_max_body_size`, `client_body_timeout`, `client_body_buffer_size`, `send_timeout`, and configuration contexts: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx `include` directive: https://nginx.org/en/docs/ngx_core_module.html#include
- Nginx proxy module directives including `proxy_request_buffering`, `proxy_read_timeout`, and `proxy_send_timeout`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx FastCGI module directives including `fastcgi_read_timeout`, `fastcgi_send_timeout`, and FastCGI buffer directives: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Nginx runtime control and reload behavior: https://nginx.org/en/docs/control.html
- PHP file upload configuration pitfalls: https://www.php.net/manual/en/features.file-upload.common-pitfalls.php
- Express API reference for `express.json()` and `express.urlencoded()`: https://expressjs.com/en/api.html
- Multer package documentation for `limits.fileSize`: https://www.npmjs.com/package/multer
- Django `DATA_UPLOAD_MAX_MEMORY_SIZE` setting: https://docs.djangoproject.com/en/6.0/ref/settings/#data-upload-max-memory-size
- Spring Boot multipart upload properties: https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/autoconfigure/web/servlet/MultipartProperties.html
- curl man page for `-F`, `-D`, `-o`, `-I`, and request behavior: https://curl.se/docs/manpage.html
- Docker Compose top-level `version` element: https://docs.docker.com/reference/compose-file/version-and-name/
- Official nginx Docker image environment variable templates: https://hub.docker.com/_/nginx
- Cloudflare 413 documentation: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-413/
- AWS Application Load Balancer Lambda target request body limit: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/lambda-functions.html
- AWS Elastic Load Balancing documented hard HTTP header limits: https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html#http-header-limits

## Issues Found
- The post said Nginx includes files in order and later includes can override earlier settings. Nginx includes files at the exact include point, and duplicate simple directives in the same context may be invalid rather than overridden. Updated the wording to focus on included server/location blocks overriding inherited values for matching requests.
- The backend limits list used Django `DATA_UPLOAD_MAX_MEMORY_SIZE` as if it were a general file-size limit. Django documents it as a request-data memory limit, excluding file upload data in `request.FILES`; updated the bullet to mention application-level file-size checks.
- The Spring Boot backend limit only mentioned `spring.servlet.multipart.max-file-size`. Spring Boot also has `spring.servlet.multipart.max-request-size`, which controls total multipart request size; added it.
- The PHP example set `post_max_size` equal to `upload_max_filesize`. PHP upload guidance requires `post_max_size` to be large enough for the full POST body, so it should generally exceed the file limit. Updated `post_max_size` to `110M`.
- The curl header-check example used `curl -I -X POST`, which is confusing because `-I` is for header-only/HEAD-style requests and does not test the multipart upload path. Replaced it with a multipart POST that dumps response headers using `-D - -o /dev/null`.
- The load balancer section implied AWS ALB/ELB body-size limits are generally configurable. AWS documents body-size limits specifically for ALB Lambda targets and hard header limits for ALB, while Cloudflare has plan-dependent request-size limits. Updated the wording to "may have" and called out ALB with Lambda targets.
- The Docker Compose example used the obsolete top-level `version` field. Removed it per the current Compose Specification.
- The Docker/nginx environment substitution example implied manual substitution into `/etc/nginx/nginx.conf` while also mounting config read-only. Updated it to use the official nginx image template mechanism under `/etc/nginx/templates/*.template`, which renders into `/etc/nginx/conf.d/`.

## Review Notes
The remaining Nginx, FastCGI, Express, Multer, PHP, Docker, and curl examples are technically plausible for the stated troubleshooting scenario. The post could be improved in the future by adding framework-specific file-size enforcement examples for Django, but the corrected statement is accurate as written.
