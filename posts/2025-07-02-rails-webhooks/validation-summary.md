# Validation Summary: How to Implement Webhooks in Rails Applications

## Status
validated

## Post Type
Tutorial / Guide — a hands-on implementation guide covering both receiving and sending webhooks in Ruby on Rails.

## Technologies Covered
- Ruby on Rails (Active Record, Active Job, Action Controller)
- Ruby (OpenSSL HMAC, SecureRandom, JSON)
- ActiveSupport::SecurityUtils (timing-safe comparison)
- Stripe webhooks (signature scheme)
- GitHub webhooks (signature scheme)
- HTTParty (outbound HTTP)
- Sidekiq (background queues)
- PostgreSQL `jsonb` columns and containment (`@>`) queries
- RSpec / WebMock (testing)
- StatsD (metrics)
- Mermaid diagrams

## Sources Consulted
- ActiveJob retry_on / wait strategies — https://api.rubyonrails.org/classes/ActiveJob/Exceptions/ClassMethods.html
- Rails `:exponentially_longer` → `:polynomially_longer` deprecation discussion — https://discuss.rubyonrails.org/t/activejob-and-exponentially-longer/72941
- Active Record `serialize` and jsonb attribute handling — https://api.rubyonrails.org/classes/ActiveRecord/AttributeMethods/Serialization/ClassMethods.html
- Stripe webhook signature verification — https://docs.stripe.com/webhooks/signatures
- Stripe Subscription object / billing period change — https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end
- GitHub webhook payload validation (`X-Hub-Signature-256`, `sha256=`) — https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- OpenSSL::HMAC.hexdigest — https://ruby-doc.org/stdlib/libdoc/openssl/rdoc/OpenSSL/HMAC.html

## Issues Found
1. **Deprecated retry strategy (`:exponentially_longer`).** In `StripeWebhookJob`, `retry_on StandardError, wait: :exponentially_longer` used the strategy name that was deprecated after Rails 7.1 (it never actually waited exponentially — it is a quartic polynomial) and removed in Rails 7.2. Changed to `wait: :polynomially_longer`, which has identical behavior and is the current, non-deprecated name. The comment was updated from "exponential backoff" to "polynomial backoff" to match.

2. **`serialize` applied to a `jsonb` column.** `WebhookSubscription` declared `serialize :events, coder: JSON`, but the migration defines `events` as `t.jsonb`, and the `for_event` scope queries it with the Postgres `@>` containment operator. Applying `serialize` to a jsonb column double-encodes the value (it stores a JSON *string* inside the jsonb column), which breaks both the `@>` query and `events.include?(...)`; in Rails 7.1+ combining `serialize` with an already-typed column also raises an error. Removed the `serialize` line — jsonb (de)serializes arrays natively — and replaced it with an explanatory comment. This makes the model consistent with the migration and the `@>` scope.

3. **Retry-wait lambda did not match its documented schedule.** In `WebhookDeliveryJob`, `wait: ->(executions) { (executions ** 4) + 2 }` returns *seconds* (≈3s, 18s, 83s, 258s), yet the inline comment and the "Retry Strategy Diagram" both state the schedule should be 1min → 5min → 25min → ~2hrs. Changed the lambda to `(5 ** (executions - 1)).minutes`, which produces exactly 1min, 5min, 25min, and ~2hrs (125min) across the retries, so the code now matches both the comment and the diagram.

## Review Notes
- **Stripe `current_period_end` is version-dependent.** `handle_subscription_updated` reads `subscription[:current_period_end]`. As of Stripe API version `2025-03-31.basil`, the top-level `current_period_start`/`current_period_end` fields were removed from the Subscription object and moved to the subscription *items* (`items.data[].current_period_end`). The code remains correct for accounts pinned to an API version before basil, but readers on basil or later should read the period from `subscription[:items][:data][0][:current_period_end]`. Left as-is because the correct access path depends on the account's pinned API version; flagged here as a caveat.
- The manual Stripe and GitHub signature verification (HMAC-SHA256, `t=...,v1=...` parsing, `sha256=` prefix stripping, timestamp tolerance, timing-safe `secure_compare`) all match the official signature schemes. In production, Stripe's own `Stripe::Webhook.construct_event` is the recommended path, but the hand-rolled version shown is functionally accurate.
- `serialize :events, coder: JSON` syntax (the `coder:` keyword) is Rails 7.1+; the post otherwise references `ActiveRecord::Migration[7.0]`. After removing that line the post is consistent with Rails 7.1+ APIs (which is also what `:polynomially_longer` requires).
- The "20 seconds" Stripe response-timeout note and the general guidance (respond fast, process async, verify signatures, idempotency, exponential backoff, IP rate limiting) are all sound and align with current best practices.
- `secure_compare` returns `false` for differing-length strings rather than raising, so the verification paths are safe against malformed signatures.
