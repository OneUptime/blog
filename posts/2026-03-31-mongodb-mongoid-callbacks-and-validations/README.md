# How to Use Mongoid Callbacks and Validations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoid, Callback, Validation, Rails

Description: Learn how to add lifecycle callbacks and data validations to Mongoid models to enforce business rules before saving to MongoDB.

---

## Introduction

Mongoid supports the full ActiveModel validation API and ActiveSupport callback lifecycle. This means you can validate field values, trigger side effects on create/update/destroy, and keep your business logic close to your document models - the same way you would in an ActiveRecord model.

## Validations

```ruby
class User
  include Mongoid::Document

  field :name,     type: String
  field :email,    type: String
  field :age,      type: Integer
  field :role,     type: String

  validates :name,  presence: true, length: { minimum: 2, maximum: 100 }
  validates :email, presence: true,
                    uniqueness: true,
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :age,   numericality: { greater_than: 0, less_than: 130 }, allow_nil: true
  validates :role,  inclusion: { in: %w[admin editor viewer] }
end
```

Custom validator:

```ruby
class SlugValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    unless value =~ /\A[a-z0-9-]+\z/
      record.errors.add(attribute, 'must contain only lowercase letters, numbers, and hyphens')
    end
  end
end

class Article
  include Mongoid::Document
  field :slug, type: String
  validates :slug, presence: true, slug: true
end
```

## Callbacks

Mongoid supports the standard set: `before_validation`, `after_validation`, `before_create`, `after_create`, `before_update`, `after_update`, `before_save`, `after_save`, `before_destroy`, `after_destroy`.

```ruby
class Article
  include Mongoid::Document
  include Mongoid::Timestamps

  field :title,      type: String
  field :body,       type: String
  field :slug,       type: String
  field :word_count, type: Integer
  field :published_at, type: Time

  before_validation :generate_slug
  before_save       :calculate_word_count
  after_create      :notify_subscribers
  before_destroy    :archive_content

  private

  def generate_slug
    self.slug ||= title.to_s.downcase.gsub(/[^a-z0-9]+/, '-').chomp('-')
  end

  def calculate_word_count
    self.word_count = body.to_s.split.length
  end

  def notify_subscribers
    SubscriberMailer.new_article(self).deliver_later
  end

  def archive_content
    ArchivedArticle.create!(title: title, body: body, archived_at: Time.now)
  end
end
```

## Skipping Callbacks

```ruby
# Persist without running callbacks (atomic update)
article.set(title: 'New Title')

# Skip validations only (callbacks still run)
article.save(validate: false)
```

## Conditional Callbacks

```ruby
before_save :send_welcome_email, if: :email_changed?
after_save  :reindex_search,     unless: :draft?
```

## Callback Chains and Halt

In Mongoid 7+ (Rails 5.1+), calling `throw :abort` from a `before_*` callback halts the chain and prevents saving:

```ruby
before_destroy do
  throw(:abort) if locked?
end
```

## Summary

Mongoid's validation API mirrors ActiveRecord, supporting presence, format, uniqueness, inclusion, and custom validators. Callbacks let you hook into the document lifecycle to automate slug generation, compute derived fields, send notifications, and guard against unwanted operations. Together they keep business logic centralised in your model layer.
