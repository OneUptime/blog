# Validation Summary: How to Configure Istio for PHP Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Kubernetes Deployments, Services, and probes
- PHP and PHP-FPM
- Nginx FastCGI configuration
- Laravel routing, middleware, cache, database, and HTTP client
- Distributed tracing headers
- cURL

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Liveness, Readiness, and Startup Probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Istio Distributed Tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Laravel 12 middleware documentation: https://laravel.com/docs/12.x/middleware
- Laravel 12 routing documentation: https://laravel.com/docs/12.x/routing
- Laravel 12 HTTP client documentation: https://laravel.com/docs/12.x/http-client
- PHP curl_exec manual: https://www.php.net/manual/en/function.curl-exec.php
- PHP-FPM configuration manual: https://www.php.net/manual/en/install.fpm.configuration.php
- Nginx FastCGI module documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html

## Issues Found
- The single-container Deployment and queue-worker Deployment omitted `spec.selector`, which is required for `apps/v1` Deployments and must match the pod template labels. Added matching selectors.
- The two-container Deployment mounted an emptyDir over `/var/www/html` in both Nginx and PHP-FPM containers. As written, that would hide application files baked into the images unless an init container populated the volume. Removed the emptyDir volume and mounts from the minimal example.
- The Laravel readiness example used `routes/api.php` for a `/ready` probe path. Current Laravel defaults apply an `/api` prefix to API routes, so the Kubernetes probe to `/ready` would not hit that route. Changed the example to `routes/web.php` and added the required facade imports.
- The Nginx FastCGI trace header list omitted `x-b3-flags` and the compact `b3` header, even though the PHP propagation examples included them and Istio documents B3 propagation for Zipkin users. Added `HTTP_X_B3_FLAGS` and `HTTP_B3` FastCGI parameters.
- The Laravel middleware registration example used `app/Http/Kernel.php`, which is not the current Laravel 12 registration path. Updated it to use `bootstrap/app.php` with `withMiddleware`.
- The plain PHP cURL helper declared `callService()` as returning `string`, but `curl_exec()` can return `false` on failure when `CURLOPT_RETURNTRANSFER` is set. Added a strict `false` check that throws a `RuntimeException` after capturing the cURL error.

## Review Notes
The Istio `VirtualService` and `DestinationRule` fields, Kubernetes probe configuration shape, PHP-FPM pool directives, Laravel HTTP client usage, and the general requirement to propagate trace context between inbound and outbound requests were consistent with the consulted documentation. The examples remain version-light; future updates could call out Laravel 10-and-earlier middleware registration separately if the blog wants to support older Laravel applications.
