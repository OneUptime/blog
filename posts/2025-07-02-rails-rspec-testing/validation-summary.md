# Validation Summary: How to Write Tests with RSpec in Rails

## Status
validated

## Post Type
Tutorial / Guide (comprehensive how-to for testing Rails apps with RSpec)

## Technologies Covered
- Ruby on Rails
- RSpec / rspec-rails
- FactoryBot (factory_bot_rails)
- Faker
- Shoulda Matchers
- Database Cleaner (database_cleaner-active_record)
- SimpleCov
- Capybara / Selenium WebDriver (system tests)
- Devise (test helpers)
- ActiveJob / ActionMailer testing
- WebMock / VCR / Timecop (mentioned in Gemfile)

## Sources Consulted
- rspec-rails docs and default generator output (`rails generate rspec:install` creates `.rspec` at project root, `spec/spec_helper.rb`, and `spec/rails_helper.rb`; `filter_rails_from_backtrace!` is only available after `require 'rspec/rails'`, i.e. in `rails_helper.rb`) — https://github.com/rspec/rspec-rails
- Shoulda Matchers — `have_one_attached` / `have_many_attached` Active Storage matchers exist (5.0+): https://github.com/thoughtbot/shoulda-matchers/blob/main/lib/shoulda/matchers/active_record/have_attached_matcher.rb
- FactoryBot docs (build/create/build_stubbed/create_list, traits, transient attributes, sequences) — https://github.com/thoughtbot/factory_bot
- RSpec ActiveJob/ActionMailer matchers (`have_enqueued_job`, `have_enqueued_mail`) — https://github.com/rspec/rspec-rails

## Issues Found
1. **`filter_rails_from_backtrace!` placed in `spec_helper.rb`** — This method is defined by `rspec-rails` and is only available after `require 'rspec/rails'`, which happens in `rails_helper.rb`, not `spec_helper.rb`. Calling it from `spec_helper.rb` raises `NoMethodError` and breaks the entire suite. Removed it from the `spec_helper.rb` block (it is correctly retained in the `rails_helper.rb` block). The default generated `spec_helper.rb` does not include this call.
2. **`.rspec` shown nested under `spec/`** in the generated-structure tree — `rails generate rspec:install` creates `.rspec` at the **project root**, not inside `spec/`. Corrected the directory tree to show `.rspec` at the root level.

## Review Notes
- The `have_one_attached(:featured_image)` shoulda matcher was verified as valid (added in shoulda-matchers 5.0+; the post pins `~> 5.3`, so it is available).
- `rescue` used directly inside `do...end` blocks in the custom matchers (`include_json`, `have_json_path`) is valid Ruby 2.6+, which is well within the Rails versions implied here.
- All gem version pins (rspec-rails ~> 6.1, factory_bot_rails ~> 6.4, faker ~> 3.2, capybara ~> 3.39, selenium-webdriver ~> 4.16, shoulda-matchers ~> 5.3, etc.) are plausible and mutually compatible for the mid-2025 timeframe of the post.
- The example specs reference application code (models, services, jobs, mailers, scopes, custom methods) that the reader must implement themselves; they are illustrative and internally consistent rather than runnable against a fixed schema, which is appropriate for a tutorial.
