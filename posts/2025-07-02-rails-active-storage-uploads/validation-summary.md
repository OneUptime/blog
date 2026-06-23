# Validation Summary: How to Handle File Uploads with Active Storage

## Status
validated

## Post Type
Tutorial / Guide (comprehensive how-to with code examples)

## Technologies Covered
- Ruby on Rails (Active Storage, Rails 7)
- Active Record
- Amazon S3 / Google Cloud Storage / Azure Blob Storage
- image_processing gem (libvips / ImageMagick)
- Stimulus / Hotwire (direct upload progress UI)
- Importmaps and `@rails/activestorage` JS
- Minitest and RSpec testing
- AWS IAM bucket policy / S3 CORS

## Sources Consulted
- Rails Guides — Active Storage Overview: https://guides.rubyonrails.org/active_storage_overview.html
- Rails API — `ActiveStorage::Attached::One` / `::Many`, `Blob`, `Attachment`
- Active Storage install migration template (rails/rails `db/migrate/*_create_active_storage_tables.active_storage.rb`)
- image_processing gem README (resize_to_limit / resize_to_fill / saver / colourspace options): https://github.com/janko/image_processing
- Stimulus Handbook — Lifecycle callbacks (`initialize`, `connect`, `disconnect`): https://stimulus.hotwired.dev/reference/lifecycle-callbacks
- Rails direct uploads JS events (`direct-upload:initialize|start|progress|end`)
- AWS S3 `aws-sdk-s3` gem usage and `config/storage.yml` service options

## Issues Found
1. **Stimulus method name collision with reserved `initialize` lifecycle callback** (Stimulus controller for upload progress).
   - What was wrong: The controller defined `initialize(event)` and wired the `direct-upload:initialize` event to `upload#initialize`. In Stimulus, `initialize()` is a reserved lifecycle callback that the framework invokes once, with **no arguments**, when the controller is constructed. With the original code, that construction-time call would run `const { target, detail } = event` against an `undefined` event and throw `TypeError: Cannot destructure property 'target' of undefined`, breaking the entire controller before any upload occurred.
   - What I changed: Renamed the handler method to `prepare(event)`, updated the `data-action` mapping to `direct-upload:initialize->upload#prepare`, and added a short comment explaining why `initialize` must be avoided.
   - Why: To make the example actually work as written and avoid a runtime crash on controller instantiation.

## Review Notes
- The `active_storage:install` migration (blobs, attachments, variant_records tables) matches the official Rails 7 template, including the `active_storage_variant_records` table introduced in Rails 6.1.
- `config/storage.yml` service entries (Disk, S3, GCS, AzureStorage) and the per-environment `config.active_storage.service` settings are correct.
- Named variants via `has_one_attached :avatar do |attachable| ... end` and `attachable.variant ...` are Rails 7 features and used correctly; `variant_processor = :vips` is the Rails 7 default.
- image_processing options used (`resize_to_limit`, `resize_to_fill` with `{ crop: :attention }`, `format:`, `saver: { quality: ... }`, `colourspace: 'b-w'`) are valid libvips options.
- The custom `AttachmentValidator` correctly maps to `validates :avatar, attachment: {...}` via Rails' validator naming convention; the `blob.analyze` / `metadata` fallback for dimensions is slightly roundabout but functional.
- Config keys (`service_urls_expire_in`, `resolve_model_to_route`, `content_types_to_serve_as_binary`, `content_types_allowed_inline`) and scopes (`ActiveStorage::Blob.unattached`) are accurate.
- `purge`, `purge_later` on both single and many attachments, and the testing helpers (`fixture_file_upload`, `ActiveStorage::FixtureSet`, fixtures) are all correct.
- No version-specific caveats beyond noting the post targets Rails 7+ (named variants and `variant_records` require 6.1/7+).
