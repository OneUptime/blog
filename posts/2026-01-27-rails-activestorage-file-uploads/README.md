# How to Implement File Uploads with ActiveStorage in Rails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ruby on Rails, ActiveStorage, File Uploads, AWS S3, Cloud Storage

Description: Learn how to implement file uploads in Ruby on Rails using ActiveStorage, including cloud storage integration, direct uploads, and image processing.

---

> ActiveStorage provides a simple, unified API for file uploads in Rails. It handles cloud storage, direct uploads, and image transformations out of the box - no external gems required.

File uploads are a common requirement in web applications. Rails' ActiveStorage, introduced in Rails 5.2, provides an elegant solution that integrates seamlessly with your models and supports multiple cloud storage providers. This guide covers everything you need to implement production-ready file uploads.

## What is ActiveStorage and Why Use It

ActiveStorage is a built-in Rails framework for attaching files to Active Record models. Key benefits include:

- **Zero configuration for development** - Works with local disk storage immediately
- **Cloud storage support** - Native integration with S3, GCS, and Azure
- **Direct uploads** - Upload files directly from browser to cloud storage
- **Image variants** - Built-in image transformations using libvips or ImageMagick
- **Mirroring** - Upload to multiple services simultaneously for redundancy

## Setting Up ActiveStorage

### Install ActiveStorage

Run the installation generator and migrate:

```ruby
# Generate ActiveStorage tables
rails active_storage:install

# Run the migration
rails db:migrate
```

This creates two tables: `active_storage_blobs` (file metadata) and `active_storage_attachments` (polymorphic join table).

### Configure Storage Services

Edit `config/storage.yml` to define your storage services:

```yaml
# config/storage.yml

# Local disk storage for development
local:
  service: Disk
  root: <%= Rails.root.join("storage") %>

# Amazon S3
amazon:
  service: S3
  access_key_id: <%= ENV['AWS_ACCESS_KEY_ID'] %>
  secret_access_key: <%= ENV['AWS_SECRET_ACCESS_KEY'] %>
  region: <%= ENV['AWS_REGION'] %>
  bucket: <%= ENV['AWS_BUCKET'] %>

# Google Cloud Storage
google:
  service: GCS
  project: <%= ENV['GCS_PROJECT'] %>
  credentials: <%= ENV['GCS_CREDENTIALS'] %>
  bucket: <%= ENV['GCS_BUCKET'] %>

# Microsoft Azure Storage
azure:
  service: AzureStorage
  storage_account_name: <%= ENV['AZURE_ACCOUNT'] %>
  storage_access_key: <%= ENV['AZURE_ACCESS_KEY'] %>
  container: <%= ENV['AZURE_CONTAINER'] %>
```

Set the active service per environment:

```ruby
# config/environments/development.rb
config.active_storage.service = :local

# config/environments/production.rb
config.active_storage.service = :amazon
```

### Add Required Gems

For cloud storage, add the appropriate gem:

```ruby
# Gemfile

# For AWS S3
gem "aws-sdk-s3", require: false

# For Google Cloud Storage
gem "google-cloud-storage", require: false

# For Azure Storage
gem "azure-storage-blob", "~> 2.0", require: false

# For image processing
gem "image_processing", "~> 1.2"
```

## Attaching Files to Models

### Single File Attachment

Use `has_one_attached` for single file uploads:

```ruby
# app/models/user.rb
class User < ApplicationRecord
  # Attach a single avatar image
  has_one_attached :avatar
end

# Usage in controller
class UsersController < ApplicationController
  def update
    # Attach file from params
    @user.avatar.attach(params[:avatar])

    # Or attach with specific attributes
    @user.avatar.attach(
      io: File.open('/path/to/file'),
      filename: 'avatar.jpg',
      content_type: 'image/jpeg'
    )
  end
end

# Check if attached
@user.avatar.attached? # => true/false

# Remove attachment
@user.avatar.purge        # Synchronous deletion
@user.avatar.purge_later  # Background job deletion
```

### Multiple File Attachments

Use `has_many_attached` for multiple files:

```ruby
# app/models/post.rb
class Post < ApplicationRecord
  # Attach multiple images
  has_many_attached :images
end

# Usage
class PostsController < ApplicationController
  def create
    @post = Post.new(post_params)

    # Attach multiple files
    @post.images.attach(params[:post][:images])

    @post.save
  end

  private

  def post_params
    params.require(:post).permit(:title, :content, images: [])
  end
end

# Iterate over attachments
@post.images.each do |image|
  puts image.filename
end

# Remove specific attachment
@post.images.find(attachment_id).purge

# Remove all attachments
@post.images.purge_all
```

### Form Helpers

Create forms for file uploads:

```erb
<%# app/views/users/_form.html.erb %>
<%= form_with model: @user do |form| %>
  <%# Single file upload %>
  <%= form.file_field :avatar %>

  <%# Show current avatar if exists %>
  <% if @user.avatar.attached? %>
    <%= image_tag @user.avatar, class: "avatar-preview" %>
  <% end %>

  <%= form.submit %>
<% end %>

<%# Multiple file upload %>
<%= form_with model: @post do |form| %>
  <%= form.file_field :images, multiple: true %>
  <%= form.submit %>
<% end %>
```

## Direct Uploads for Better UX

Direct uploads allow files to be uploaded straight from the browser to cloud storage, bypassing your Rails server. This improves performance and reduces server load.

### Enable Direct Uploads

Include the JavaScript library:

```javascript
// app/javascript/application.js
import * as ActiveStorage from "@rails/activestorage"
ActiveStorage.start()
```

Or with importmaps:

```ruby
# config/importmap.rb
pin "@rails/activestorage", to: "activestorage.esm.js"
```

### Direct Upload Form

Add `direct_upload: true` to your file field:

```erb
<%= form_with model: @user do |form| %>
  <%= form.file_field :avatar, direct_upload: true %>
  <%= form.submit %>
<% end %>
```

### Track Upload Progress

Add event listeners for upload progress:

```javascript
// app/javascript/controllers/upload_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "progress"]

  connect() {
    this.inputTarget.addEventListener("direct-upload:initialize", this.onInitialize.bind(this))
    this.inputTarget.addEventListener("direct-upload:start", this.onStart.bind(this))
    this.inputTarget.addEventListener("direct-upload:progress", this.onProgress.bind(this))
    this.inputTarget.addEventListener("direct-upload:error", this.onError.bind(this))
    this.inputTarget.addEventListener("direct-upload:end", this.onEnd.bind(this))
  }

  onInitialize(event) {
    const { id, file } = event.detail
    console.log(`Preparing to upload ${file.name}`)
  }

  onStart(event) {
    const { id, file } = event.detail
    this.progressTarget.classList.remove("hidden")
  }

  onProgress(event) {
    const { id, file, progress } = event.detail
    this.progressTarget.style.width = `${progress}%`
    this.progressTarget.textContent = `${Math.round(progress)}%`
  }

  onError(event) {
    const { id, file, error } = event.detail
    console.error(`Upload failed: ${error}`)
  }

  onEnd(event) {
    const { id, file } = event.detail
    console.log(`Upload complete: ${file.name}`)
  }
}
```

### Configure CORS for Direct Uploads

For S3, configure CORS to allow direct uploads:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": ["Origin", "Content-Type", "Content-MD5", "Content-Disposition"],
    "MaxAgeSeconds": 3600
  }
]
```

## Image Variants and Transformations

ActiveStorage can generate image variants on-the-fly using libvips or ImageMagick.

### Define Variants

```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_one_attached :avatar do |attachable|
    # Define named variants
    attachable.variant :thumb, resize_to_limit: [100, 100]
    attachable.variant :medium, resize_to_limit: [300, 300]
    attachable.variant :large, resize_to_limit: [800, 800]
  end
end
```

### Use Variants in Views

```erb
<%# Generate thumbnail on first request, cached thereafter %>
<%= image_tag @user.avatar.variant(:thumb) %>

<%# Or define inline %>
<%= image_tag @user.avatar.variant(resize_to_limit: [200, 200]) %>

<%# Use representation for any file type (generates preview for PDFs, videos) %>
<%= image_tag @user.document.representation(resize_to_limit: [400, 400]) %>
```

### Common Transformations

```ruby
# app/models/post.rb
class Post < ApplicationRecord
  has_many_attached :images do |attachable|
    # Resize and crop to exact dimensions
    attachable.variant :square, resize_to_fill: [400, 400]

    # Resize maintaining aspect ratio
    attachable.variant :preview, resize_to_limit: [600, 400]

    # Convert format and adjust quality
    attachable.variant :optimized,
      resize_to_limit: [1200, 1200],
      saver: { quality: 80 },
      format: :webp

    # Apply multiple transformations
    attachable.variant :watermarked,
      resize_to_limit: [800, 800],
      colourspace: "srgb",
      strip: true
  end
end
```

### Preprocess Variants

Generate variants immediately after upload:

```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_one_attached :avatar do |attachable|
    attachable.variant :thumb, resize_to_limit: [100, 100], preprocessed: true
  end
end

# Or process all variants in a callback
after_commit :process_avatar_variants, on: [:create, :update]

private

def process_avatar_variants
  return unless avatar.attached?

  avatar.variant(:thumb).processed
  avatar.variant(:medium).processed
end
```

## Validating File Types and Sizes

ActiveStorage does not include built-in validations. Use the `activestorage-validator` gem or create custom validations.

### Custom Validations

```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_one_attached :avatar

  # Validate file type
  validate :acceptable_avatar

  private

  def acceptable_avatar
    return unless avatar.attached?

    # Check file size (max 5MB)
    if avatar.byte_size > 5.megabytes
      errors.add(:avatar, "is too large (maximum is 5MB)")
    end

    # Check content type
    acceptable_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    unless acceptable_types.include?(avatar.content_type)
      errors.add(:avatar, "must be a JPEG, PNG, GIF, or WebP image")
    end
  end
end
```

### Reusable Validation Concern

```ruby
# app/models/concerns/file_validatable.rb
module FileValidatable
  extend ActiveSupport::Concern

  class_methods do
    # Validate single attachment
    def validates_attachment(attribute, content_types: [], max_size: nil)
      validate do
        attachment = send(attribute)
        return unless attachment.attached?

        if max_size && attachment.byte_size > max_size
          errors.add(attribute, "is too large (maximum is #{max_size / 1.megabyte}MB)")
        end

        if content_types.any? && !content_types.include?(attachment.content_type)
          errors.add(attribute, "has invalid file type")
        end
      end
    end

    # Validate multiple attachments
    def validates_attachments(attribute, content_types: [], max_size: nil, max_count: nil)
      validate do
        attachments = send(attribute)
        return unless attachments.attached?

        if max_count && attachments.count > max_count
          errors.add(attribute, "too many files (maximum is #{max_count})")
        end

        attachments.each do |attachment|
          if max_size && attachment.byte_size > max_size
            errors.add(attribute, "contains file that is too large")
          end

          if content_types.any? && !content_types.include?(attachment.content_type)
            errors.add(attribute, "contains file with invalid type")
          end
        end
      end
    end
  end
end

# Usage
class Post < ApplicationRecord
  include FileValidatable

  has_many_attached :images

  validates_attachments :images,
    content_types: ["image/jpeg", "image/png"],
    max_size: 10.megabytes,
    max_count: 5
end
```

## Serving Files and Generating URLs

### Generate URLs

```ruby
# Permanent URL (redirects through your app)
url_for(@user.avatar)

# Temporary direct URL to storage service (expires)
@user.avatar.url(expires_in: 1.hour)

# Variant URL
url_for(@user.avatar.variant(:thumb))

# In controllers
redirect_to rails_blob_path(@user.avatar, disposition: "attachment")
```

### Download vs Inline Display

```ruby
# Force download
rails_blob_path(@document, disposition: "attachment")

# Display inline (default)
rails_blob_path(@image, disposition: "inline")
```

### Proxy Mode

Serve files through your application instead of redirecting to cloud storage:

```ruby
# config/environments/production.rb
config.active_storage.resolve_model_to_route = :rails_storage_proxy

# Or configure per-service
# config/storage.yml
amazon:
  service: S3
  # ... credentials
  public: false  # Use signed URLs (default)

# For public buckets
amazon_public:
  service: S3
  # ... credentials
  public: true  # Use public URLs
```

### CDN Configuration

Add a CDN host for better performance:

```ruby
# config/environments/production.rb
config.active_storage.service = :amazon
config.active_storage.resolve_model_to_route = :rails_storage_proxy

# Configure CDN
Rails.application.routes.default_url_options[:host] = "cdn.yourdomain.com"
```

## Testing File Uploads

### Configure Test Environment

```ruby
# config/environments/test.rb
config.active_storage.service = :test
```

### Unit Tests

```ruby
# test/models/user_test.rb
require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "avatar can be attached" do
    user = users(:one)

    # Attach a fixture file
    user.avatar.attach(
      io: File.open(Rails.root.join("test/fixtures/files/avatar.jpg")),
      filename: "avatar.jpg",
      content_type: "image/jpeg"
    )

    assert user.avatar.attached?
    assert_equal "avatar.jpg", user.avatar.filename.to_s
  end

  test "validates avatar file type" do
    user = users(:one)

    # Try attaching invalid file type
    user.avatar.attach(
      io: File.open(Rails.root.join("test/fixtures/files/document.pdf")),
      filename: "document.pdf",
      content_type: "application/pdf"
    )

    assert_not user.valid?
    assert_includes user.errors[:avatar], "must be a JPEG, PNG, GIF, or WebP image"
  end

  test "validates avatar file size" do
    user = users(:one)

    # Create a large fake file
    large_io = StringIO.new("x" * 6.megabytes)

    user.avatar.attach(
      io: large_io,
      filename: "large.jpg",
      content_type: "image/jpeg"
    )

    assert_not user.valid?
    assert_includes user.errors[:avatar], "is too large (maximum is 5MB)"
  end
end
```

### Integration Tests

```ruby
# test/integration/uploads_test.rb
require "test_helper"

class UploadsTest < ActionDispatch::IntegrationTest
  include ActionDispatch::TestProcess::FixtureFile

  test "user can upload avatar" do
    user = users(:one)
    sign_in user

    # Use fixture_file_upload helper
    avatar = fixture_file_upload("files/avatar.jpg", "image/jpeg")

    patch user_path(user), params: {
      user: { avatar: avatar }
    }

    assert_redirected_to user_path(user)
    assert user.reload.avatar.attached?
  end

  test "user can upload multiple images" do
    post_record = posts(:one)

    images = [
      fixture_file_upload("files/image1.jpg", "image/jpeg"),
      fixture_file_upload("files/image2.jpg", "image/jpeg")
    ]

    patch post_path(post_record), params: {
      post: { images: images }
    }

    assert_equal 2, post_record.reload.images.count
  end
end
```

### RSpec Examples

```ruby
# spec/models/user_spec.rb
require "rails_helper"

RSpec.describe User, type: :model do
  describe "avatar attachment" do
    let(:user) { create(:user) }

    it "attaches an avatar" do
      user.avatar.attach(
        io: File.open(Rails.root.join("spec/fixtures/files/avatar.jpg")),
        filename: "avatar.jpg",
        content_type: "image/jpeg"
      )

      expect(user.avatar).to be_attached
    end

    it "generates variants" do
      user.avatar.attach(
        io: File.open(Rails.root.join("spec/fixtures/files/avatar.jpg")),
        filename: "avatar.jpg",
        content_type: "image/jpeg"
      )

      # Variant is processable
      expect { user.avatar.variant(:thumb).processed }.not_to raise_error
    end
  end
end
```

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Use direct uploads** | Reduce server load by uploading directly to cloud storage |
| **Validate early** | Check file types and sizes before processing |
| **Preprocess variants** | Generate common variants immediately after upload |
| **Set reasonable limits** | Enforce file size limits to prevent abuse |
| **Use background jobs** | Process large files or multiple variants asynchronously |
| **Configure CORS** | Required for direct uploads to cloud storage |
| **Test thoroughly** | Test uploads, validations, and variants |
| **Use CDN** | Serve files through a CDN for better performance |
| **Purge unused files** | Clean up orphaned blobs with `rails active_storage:purge:unattached` |

ActiveStorage simplifies file uploads in Rails while providing the flexibility to scale from local development to production cloud storage. By following these patterns, you can implement robust file handling that performs well under load.

---

If you are looking for a complete observability solution to monitor your Rails applications, check out [OneUptime](https://oneuptime.com) - an open-source platform for uptime monitoring, incident management, and status pages.
