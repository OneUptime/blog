# How to Use Mongoid Relations and Embeds in Rails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoid, Relation, Embed, Rails

Description: Understand the difference between Mongoid referenced relations and embedded documents, and when to use each pattern in Rails applications.

---

## Introduction

Mongoid supports two fundamentally different ways to model relationships: referenced relations (stored as separate documents with foreign keys) and embedded documents (stored nested inside the parent document). Choosing the right pattern has a significant impact on query performance and data consistency.

## Embedded Documents

Use embedded documents when the child data is only ever accessed through the parent and when the total document size stays well below 16 MB.

```ruby
class BlogPost
  include Mongoid::Document
  include Mongoid::Timestamps

  field :title, type: String
  field :body,  type: String

  embeds_many :comments
  embeds_one  :seo_meta
end

class Comment
  include Mongoid::Document

  field :author, type: String
  field :body,   type: String
  field :posted_at, type: Time

  embedded_in :blog_post
end

class SeoMeta
  include Mongoid::Document

  field :meta_title,       type: String
  field :meta_description, type: String

  embedded_in :blog_post
end
```

Querying embedded documents:

```ruby
post = BlogPost.find(id)
post.comments.where(author: 'Alice').first
post.comments.create!(author: 'Bob', body: 'Great post!', posted_at: Time.now)
```

## Referenced Relations

Use referenced relations when the child needs to exist independently, is accessed without the parent, or the collection grows unbounded.

```ruby
class User
  include Mongoid::Document

  field :name,  type: String
  field :email, type: String

  has_many   :posts,  class_name: 'BlogPost', dependent: :destroy
  has_and_belongs_to_many :roles
end

class BlogPost
  include Mongoid::Document

  belongs_to :user
  has_many   :tags, dependent: :nullify
end
```

Querying referenced relations triggers a separate query:

```ruby
user = User.find(id)
user.posts.where(published: true).order_by(created_at: :desc).limit(5)
```

## Recursive Embedding

```ruby
class Category
  include Mongoid::Document

  field :name, type: String
  embeds_many :subcategories, class_name: 'Category'
  embedded_in :parent_category, class_name: 'Category'
end
```

## Polymorphic Relations

```ruby
class Image
  include Mongoid::Document

  field :url, type: String
  belongs_to :imageable, polymorphic: true
end

class Article
  include Mongoid::Document
  has_many :images, as: :imageable
end
```

## Choosing Embed vs Reference

```text
Embed when:
- Child is always accessed via parent
- Child has no independent existence
- Small, bounded number of children

Reference when:
- Child is queried independently
- Child belongs to multiple parents
- Unbounded growth expected
```

## Summary

Mongoid embedded documents co-locate related data in a single MongoDB document for fast reads, while referenced relations use foreign keys for flexibility and independent access. Embed comments, line items, and metadata. Reference users, products, and categories. Getting this balance right is the most important schema design decision in a Mongoid application.
