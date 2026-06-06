# Validation Summary: How to Implement Middleware in Actix

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Rust
- Actix-web 4.x
- actix-service 2.x
- futures-util
- Middleware patterns (Transform / Service traits)
- `from_fn` middleware helper
- JWT-based authentication (illustrative)
- HTTP security headers
- Request extensions / `FromRequest` extractors
- `EitherBody` for short-circuiting middleware

## Sources Consulted
- actix-service `Service` trait: https://docs.rs/actix-service/2/actix_service/trait.Service.html
- actix-web `Transform` trait: https://docs.rs/actix-web/4/actix_web/dev/trait.Transform.html
- actix-web `ServiceResponse` (incl. `map_into_left_body`, `map_into_right_body`): https://docs.rs/actix-web/4/actix_web/dev/struct.ServiceResponse.html
- actix-web `EitherBody`: https://docs.rs/actix-web/4/actix_web/body/enum.EitherBody.html
- actix-web `middleware::from_fn`: https://docs.rs/actix-web/4/actix_web/middleware/fn.from_fn.html
- actix-web `middleware::Next`: https://docs.rs/actix-web/4/actix_web/middleware/struct.Next.html
- actix-web `MessageBody`: https://docs.rs/actix-web/4/actix_web/body/trait.MessageBody.html
- actix-web `AUTHORIZATION` header constant: https://docs.rs/actix-web/4/actix_web/http/header/constant.AUTHORIZATION.html
- actix-web CHANGES.md (for `from_fn` availability): https://github.com/actix/actix-web/blob/master/actix-web/CHANGES.md

## Issues Found

1. **JwtAuth middleware: incorrect `Response` associated type.**
   The original code declared `type Response = ServiceResponse<Bd>` on both the `Transform` and `Service` impls, but the `call` method uses both `service.call(req).await.map(|res| res.map_into_left_body())` and `req.into_response(response).map_into_right_body()`. Both produce `ServiceResponse<EitherBody<Bd, BoxBody>>`, not `ServiceResponse<Bd>`. This would fail to type-check.
   - **Fix**: Changed `type Response = ServiceResponse<Bd>` to `type Response = ServiceResponse<EitherBody<Bd>>` in both the `Transform<Svc, ServiceRequest> for JwtAuth` and the `Service<ServiceRequest> for JwtAuthMiddleware<Svc>` impls.
   - **Fix**: Added `body::EitherBody` to the import list at the top of the example.
   - Source: https://docs.rs/actix-web/4/actix_web/dev/struct.ServiceResponse.html

2. **JwtAuth `should_skip` branch: missing body conversion.**
   The early-return branch for skipped paths called `service.call(req).await` directly, producing `ServiceResponse<Bd>`. Since the function's response type must now be `ServiceResponse<EitherBody<Bd>>`, this branch wouldn't type-check either.
   - **Fix**: Changed to `service.call(req).await.map(|res| res.map_into_left_body())`.

3. **`from_fn` examples: unnecessary `EitherBody` in the return type.**
   `timing_middleware` and `request_id_middleware` never short-circuit — they always call `next.call(req).await` and return its result. The original code declared the return type as `ServiceResponse<EitherBody<impl MessageBody>>` and called `.map_into_left_body()`. The official actix-web docs for `from_fn` show the idiomatic non-short-circuiting pattern as `ServiceResponse<impl MessageBody>` (no `EitherBody`).
   - **Fix**: Changed the return types to `Result<ServiceResponse<impl actix_web::body::MessageBody>, Error>`, removed the `.map_into_left_body()` calls (now just `Ok(response)`), and removed the now-unused `use actix_web::body::EitherBody;` import.
   - Source: https://docs.rs/actix-web/4/actix_web/middleware/fn.from_fn.html

## Review Notes

- `actix_web::middleware::from_fn` was promoted from `actix-web-lab` into actix-web core in **actix-web 4.9.0**. The post's `Cargo.toml` snippet uses `actix-web = "4"`, which resolves to the latest 4.x and so will include `from_fn`. Worth noting that readers pinned to older 4.x patch versions (< 4.9) will not have it; the post implicitly assumes a recent 4.x.
- `Service::poll_ready` and `Service::call` take `&self` in actix-service 2.x. The post correctly uses `&self` everywhere — verified.
- The `MetricsCollector` example uses `Rc<Mutex<HashMap<...>>>`. Because `Rc` is `!Send`, this collector cannot be cloned into the `HttpServer::new` factory closure to share state across worker threads. State is per-worker only. The post doesn't claim cross-worker sharing, and the example shows only the middleware definition (no `main`), so this is a constraint a reader should be aware of rather than a bug. For truly app-wide metrics, `Arc<Mutex<...>>` (or better, atomic counters / a sharded structure) would be required, with the collector created outside the factory and cloned in.
- The `RateLimiter` uses a single global `AtomicU32` counter that monotonically increases and never resets. As stated in the inline comment ("use Redis in production"), this is purely illustrative — readers should not deploy it as-is.
- The "Passing Data Between Middleware and Handlers" example stores the user ID as a bare `String` in request extensions, then retrieves it with `get::<String>()`. Extensions are keyed by type, so any other `String` inserted by another middleware would collide. A newtype like `struct UserId(String)` is the idiomatic fix; the post doesn't make this clear, though it's a design quality note rather than a correctness bug.
- The `Cargo.toml` snippet lists `actix-service = "2"` and `futures-util = "0.3"`, which match current crate versions.
- All other code blocks (the generic `MyMiddleware`, `RequestLogger`, `SecurityHeaders`, `RateLimiter`, `MetricsCollector`, and the handler/extractor examples) check out against the actix-web 4 API.
