# Validation Summary: How to Configure Action Mailer for Email in Rails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby on Rails (Action Mailer)
- Active Job / Sidekiq (background delivery)
- SMTP
- SendGrid (SMTP and Web API via `sendgrid-ruby`)
- ERB email templates (HTML + plain text)
- Letter Opener (development email previews)
- RSpec / Minitest mailer testing
- SendGrid Event Webhooks

## Sources Consulted
- Action Mailer Basics — Ruby on Rails Guides: https://guides.rubyonrails.org/action_mailer_basics.html
- ActiveJob::Exceptions::ClassMethods (retry_on / backoff) — Rails API: https://edgeapi.rubyonrails.org/classes/ActiveJob/Exceptions/ClassMethods.html
- rails/rails activejob exceptions.rb (backoff implementation): https://github.com/rails/rails/blob/main/activejob/lib/active_job/exceptions.rb
- ActionMailer::MailDeliveryJob — RubyDoc/Rails API: https://www.rubydoc.info/github/rails/rails/ActionMailer/MailDeliveryJob
- "The 15-Year Naming Bug: polynomially_longer" (deprecation context): https://dev.to/davidteren/the-15-year-naming-bug-how-rails-finally-got-polynomiallylonger-right-3g36
- sendgrid-ruby usage (SendGrid Mail/Personalization/Content API)

## Issues Found
1. **Deprecated/removed retry backoff symbol.** The retry job used `retry_on Net::SMTPServerBusy, wait: :exponentially_longer, attempts: 5`. `:exponentially_longer` was deprecated in Rails 7.1 and removed in Rails 8.0 in favor of `:polynomially_longer` (the algorithm was always polynomial, never exponential). Since the post targets a current Rails release, this would emit a deprecation warning (7.1) or fail (8.0). Changed to `wait: :polynomially_longer`, which preserves identical behavior.

2. **Invalid class reopening (superclass mismatch).** The retry example defined `class ActionMailer::MailDeliveryJob < ApplicationJob`. The built-in `ActionMailer::MailDeliveryJob` inherits from `ActiveJob::Base`, not `ApplicationJob`, so reopening the constant with a different superclass raises `TypeError: superclass mismatch for class MailDeliveryJob`. Replaced with the supported pattern: a new `CustomMailDeliveryJob < ActionMailer::MailDeliveryJob` class wired up via `config.action_mailer.delivery_job = "CustomMailDeliveryJob"` (added an explanatory comment). This keeps the same retry/discard logic while being valid.

## Review Notes
- The post privately redefines `email_address_with_name(email, name)` in `UserMailer`. Action Mailer already provides a built-in `email_address_with_name` helper (Rails 5+), so the custom method is redundant but not incorrect — left as-is to avoid restructuring.
- `config.action_mailer.preview_paths <<` is correct for Rails 7.1+ (the singular `preview_path` was deprecated). Accurate for current Rails.
- `after_discard do |job, exception|` is valid on Active Job as of Rails 8.0; appropriate given the post's timeframe.
- SMTP settings, SendGrid SMTP (`user_name: "apikey"` + API key as password on `smtp.sendgrid.net:587`), credentials usage, interceptors/observers, `deliver_later(wait:/wait_until:)`, and the SendGrid Event Webhook signature headers (`X-Twilio-Email-Event-Webhook-Signature/-Timestamp`) all check out against current documentation.
- The SendGrid Web API delivery method using `sendgrid-ruby` (`SendGrid::Mail`, `Personalization`, `Content`, `Attachment`, `sg.client.mail._("send").post`) matches the gem's current API.
