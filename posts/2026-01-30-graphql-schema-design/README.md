# How to Create GraphQL Schema Design

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: GraphQL, API Design, Schema, Backend

Description: Design effective GraphQL schemas with proper types, connections, mutations, and input validation for scalable and maintainable APIs.

---

GraphQL schemas define the contract between your API and its consumers. A well-designed schema makes your API intuitive, maintainable, and scalable. This guide walks through practical patterns and techniques for building production-ready GraphQL schemas.

## Understanding the Schema Definition Language (SDL)

GraphQL uses SDL to define types and their relationships. Before diving into advanced patterns, let's establish the fundamentals.

### Basic Type Definitions

Every GraphQL schema starts with object types. These represent the data your API exposes.

```graphql
# Basic object type representing a user in your system
type User {
  id: ID!
  email: String!
  username: String!
  displayName: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

# Object type for blog posts with relationships
type Post {
  id: ID!
  title: String!
  slug: String!
  content: String!
  excerpt: String
  publishedAt: DateTime
  author: User!
  tags: [Tag!]!
  comments: [Comment!]!
  viewCount: Int!
  isPublished: Boolean!
}

# Tag type for categorization
type Tag {
  id: ID!
  name: String!
  slug: String!
  posts: [Post!]!
}
```

The exclamation mark (`!`) indicates a non-nullable field. Use it when the field should always have a value. Omit it when null is a valid response.

### Scalar Types

GraphQL provides five built-in scalar types:

| Scalar | Description | Example |
|--------|-------------|---------|
| `Int` | 32-bit signed integer | `42` |
| `Float` | Double-precision floating point | `3.14` |
| `String` | UTF-8 character sequence | `"hello"` |
| `Boolean` | True or false | `true` |
| `ID` | Unique identifier (serialized as String) | `"abc123"` |

## Custom Scalar Types

Built-in scalars often aren't enough for real applications. Custom scalars let you define specialized data types with validation.

### Defining Custom Scalars

```graphql
# Custom scalar declarations in your schema
scalar DateTime
scalar Email
scalar URL
scalar JSON
scalar PositiveInt
scalar UUID
```

### Implementing Custom Scalars in Code

Here's how to implement custom scalars in a Node.js GraphQL server:

```javascript
// scalars/DateTime.js
const { GraphQLScalarType, Kind } = require('graphql');

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO-8601 formatted date-time string',

  // Value sent to the client
  serialize(value) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    throw new Error('DateTime must be a Date instance');
  },

  // Value received from client variables
  parseValue(value) {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    throw new Error('Invalid DateTime format');
  },

  // Value received from inline arguments
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      const date = new Date(ast.value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    throw new Error('Invalid DateTime format');
  },
});

module.exports = DateTimeScalar;
```

```javascript
// scalars/Email.js
const { GraphQLScalarType, Kind } = require('graphql');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EmailScalar = new GraphQLScalarType({
  name: 'Email',
  description: 'Valid email address',

  serialize(value) {
    if (typeof value === 'string' && EMAIL_REGEX.test(value)) {
      return value.toLowerCase();
    }
    throw new Error('Invalid email format');
  },

  parseValue(value) {
    if (typeof value === 'string' && EMAIL_REGEX.test(value)) {
      return value.toLowerCase();
    }
    throw new Error('Invalid email format');
  },

  parseLiteral(ast) {
    if (ast.kind === Kind.STRING && EMAIL_REGEX.test(ast.value)) {
      return ast.value.toLowerCase();
    }
    throw new Error('Invalid email format');
  },
});

module.exports = EmailScalar;
```

## Enum Types

Enums restrict a field to a specific set of allowed values. Use them for status fields, categories, or any fixed set of options.

```graphql
# Status enum for content workflow
enum PostStatus {
  DRAFT
  PENDING_REVIEW
  PUBLISHED
  ARCHIVED
}

# User role enum for authorization
enum UserRole {
  ADMIN
  EDITOR
  AUTHOR
  SUBSCRIBER
}

# Sort direction for queries
enum SortDirection {
  ASC
  DESC
}

# Notification preference options
enum NotificationFrequency {
  IMMEDIATE
  DAILY_DIGEST
  WEEKLY_DIGEST
  NONE
}
```

Using enums in your types:

```graphql
type Post {
  id: ID!
  title: String!
  status: PostStatus!
  # ... other fields
}

type User {
  id: ID!
  email: Email!
  role: UserRole!
  notificationPreference: NotificationFrequency!
}
```

## Interfaces

Interfaces define a set of fields that multiple types must implement. They enable polymorphism in your schema.

```graphql
# Base interface for all content types
interface Node {
  id: ID!
}

# Content interface for items that can be published
interface Content {
  id: ID!
  title: String!
  slug: String!
  createdAt: DateTime!
  updatedAt: DateTime!
  author: User!
}

# Post implements both interfaces
type Post implements Node & Content {
  id: ID!
  title: String!
  slug: String!
  createdAt: DateTime!
  updatedAt: DateTime!
  author: User!
  content: String!
  excerpt: String
  tags: [Tag!]!
  status: PostStatus!
}

# Page also implements the Content interface
type Page implements Node & Content {
  id: ID!
  title: String!
  slug: String!
  createdAt: DateTime!
  updatedAt: DateTime!
  author: User!
  content: String!
  template: String!
  parentPage: Page
}

# Media implements only Node
type Media implements Node {
  id: ID!
  filename: String!
  mimeType: String!
  url: URL!
  size: Int!
  uploadedAt: DateTime!
  uploadedBy: User!
}
```

Querying with interfaces:

```graphql
type Query {
  # Returns any content type
  content(slug: String!): Content

  # Returns any node by ID
  node(id: ID!): Node
}
```

## Union Types

Unions represent a type that could be one of several different types. Unlike interfaces, union types don't share common fields.

```graphql
# Search result can be different types
union SearchResult = Post | Page | User | Tag

# Timeline event can be various activity types
union TimelineEvent =
  | PostCreatedEvent
  | PostPublishedEvent
  | CommentAddedEvent
  | UserJoinedEvent

type PostCreatedEvent {
  id: ID!
  post: Post!
  createdAt: DateTime!
}

type PostPublishedEvent {
  id: ID!
  post: Post!
  publishedAt: DateTime!
  publishedBy: User!
}

type CommentAddedEvent {
  id: ID!
  comment: Comment!
  post: Post!
  createdAt: DateTime!
}

type UserJoinedEvent {
  id: ID!
  user: User!
  joinedAt: DateTime!
}
```

Querying unions requires inline fragments:

```graphql
query SearchQuery($term: String!) {
  search(term: $term) {
    ... on Post {
      id
      title
      excerpt
    }
    ... on Page {
      id
      title
      template
    }
    ... on User {
      id
      username
      displayName
    }
    ... on Tag {
      id
      name
    }
  }
}
```

## Input Types

Input types define the structure of data sent to mutations and complex query arguments. They cannot contain fields that return other object types.

```graphql
# Input for creating a new user
input CreateUserInput {
  email: Email!
  username: String!
  password: String!
  displayName: String
  role: UserRole = SUBSCRIBER
}

# Input for updating user profile
input UpdateUserInput {
  displayName: String
  bio: String
  avatarUrl: URL
  notificationPreference: NotificationFrequency
}

# Input for creating posts
input CreatePostInput {
  title: String!
  content: String!
  excerpt: String
  tagIds: [ID!]
  status: PostStatus = DRAFT
  publishedAt: DateTime
}

# Input for updating posts
input UpdatePostInput {
  title: String
  content: String
  excerpt: String
  tagIds: [ID!]
  status: PostStatus
  publishedAt: DateTime
}

# Filter input for querying posts
input PostFilterInput {
  status: PostStatus
  authorId: ID
  tagIds: [ID!]
  publishedAfter: DateTime
  publishedBefore: DateTime
  searchTerm: String
}

# Sorting input
input PostSortInput {
  field: PostSortField!
  direction: SortDirection!
}

enum PostSortField {
  CREATED_AT
  UPDATED_AT
  PUBLISHED_AT
  TITLE
  VIEW_COUNT
}
```

## Relay Connection Pattern

The Relay connection specification provides a standardized way to handle pagination. It's widely adopted even outside Relay applications.

### Connection Types

```graphql
# Page info for cursor-based pagination
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# Edge type wraps each item with its cursor
type PostEdge {
  node: Post!
  cursor: String!
}

# Connection type for paginated post results
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

# Generic pattern for other types
type UserEdge {
  node: User!
  cursor: String!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type CommentEdge {
  node: Comment!
  cursor: String!
}

type CommentConnection {
  edges: [CommentEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
```

### Connection Arguments

```graphql
type Query {
  # Forward pagination with first/after
  posts(
    first: Int
    after: String
    filter: PostFilterInput
    sort: PostSortInput
  ): PostConnection!

  # Backward pagination with last/before
  users(
    first: Int
    after: String
    last: Int
    before: String
    filter: UserFilterInput
  ): UserConnection!
}

type Post {
  id: ID!
  title: String!
  # Nested connection for comments
  comments(
    first: Int
    after: String
  ): CommentConnection!
}
```

### Implementing Cursor-Based Pagination

```javascript
// resolvers/posts.js
const { encodeCursor, decodeCursor } = require('../utils/cursor');

const postsResolver = async (_, args, context) => {
  const { first = 10, after, filter, sort } = args;

  // Decode cursor to get offset
  const afterIndex = after ? decodeCursor(after) : -1;

  // Build query with filters
  let query = context.db.posts;

  if (filter?.status) {
    query = query.where('status', filter.status);
  }

  if (filter?.authorId) {
    query = query.where('authorId', filter.authorId);
  }

  if (filter?.searchTerm) {
    query = query.whereRaw(
      'title ILIKE ? OR content ILIKE ?',
      [`%${filter.searchTerm}%`, `%${filter.searchTerm}%`]
    );
  }

  // Apply sorting
  const sortField = sort?.field || 'CREATED_AT';
  const sortDirection = sort?.direction || 'DESC';
  const fieldMap = {
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at',
    PUBLISHED_AT: 'published_at',
    TITLE: 'title',
    VIEW_COUNT: 'view_count',
  };

  query = query.orderBy(fieldMap[sortField], sortDirection);

  // Get total count before pagination
  const totalCount = await query.clone().count();

  // Apply pagination
  const allItems = await query;
  const startIndex = afterIndex + 1;
  const endIndex = startIndex + first;
  const paginatedItems = allItems.slice(startIndex, endIndex);

  // Build edges with cursors
  const edges = paginatedItems.map((item, index) => ({
    node: item,
    cursor: encodeCursor(startIndex + index),
  }));

  // Build page info
  const pageInfo = {
    hasNextPage: endIndex < allItems.length,
    hasPreviousPage: startIndex > 0,
    startCursor: edges.length > 0 ? edges[0].cursor : null,
    endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
  };

  return {
    edges,
    pageInfo,
    totalCount,
  };
};

module.exports = { postsResolver };
```

```javascript
// utils/cursor.js
const encodeCursor = (index) => {
  return Buffer.from(`cursor:${index}`).toString('base64');
};

const decodeCursor = (cursor) => {
  const decoded = Buffer.from(cursor, 'base64').toString('utf8');
  const match = decoded.match(/^cursor:(\d+)$/);
  if (!match) {
    throw new Error('Invalid cursor format');
  }
  return parseInt(match[1], 10);
};

module.exports = { encodeCursor, decodeCursor };
```

## Mutations

Mutations modify data and should follow consistent patterns for predictability.

### Mutation Design Patterns

```graphql
type Mutation {
  # User mutations
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!
  deleteUser(id: ID!): DeleteUserPayload!

  # Post mutations
  createPost(input: CreatePostInput!): CreatePostPayload!
  updatePost(id: ID!, input: UpdatePostInput!): UpdatePostPayload!
  deletePost(id: ID!): DeletePostPayload!
  publishPost(id: ID!): PublishPostPayload!
  unpublishPost(id: ID!): UnpublishPostPayload!

  # Comment mutations
  addComment(postId: ID!, input: AddCommentInput!): AddCommentPayload!
  updateComment(id: ID!, input: UpdateCommentInput!): UpdateCommentPayload!
  deleteComment(id: ID!): DeleteCommentPayload!

  # Bulk operations
  bulkDeletePosts(ids: [ID!]!): BulkDeletePostsPayload!
  bulkUpdatePostStatus(ids: [ID!]!, status: PostStatus!): BulkUpdatePostStatusPayload!
}
```

### Payload Types

Payload types wrap mutation results and include error information:

```graphql
# Standard error type
type UserError {
  field: String
  message: String!
  code: ErrorCode!
}

enum ErrorCode {
  NOT_FOUND
  UNAUTHORIZED
  VALIDATION_ERROR
  DUPLICATE_ENTRY
  INTERNAL_ERROR
}

# Payload for createUser mutation
type CreateUserPayload {
  user: User
  errors: [UserError!]!
  success: Boolean!
}

# Payload for updateUser mutation
type UpdateUserPayload {
  user: User
  errors: [UserError!]!
  success: Boolean!
}

# Payload for deleteUser mutation
type DeleteUserPayload {
  deletedUserId: ID
  errors: [UserError!]!
  success: Boolean!
}

# Payload for createPost mutation
type CreatePostPayload {
  post: Post
  errors: [UserError!]!
  success: Boolean!
}

# Payload for publishPost mutation
type PublishPostPayload {
  post: Post
  errors: [UserError!]!
  success: Boolean!
}

# Payload for bulk operations
type BulkDeletePostsPayload {
  deletedIds: [ID!]!
  failedIds: [ID!]!
  errors: [UserError!]!
  success: Boolean!
}
```

### Mutation Resolver Implementation

```javascript
// resolvers/mutations/createPost.js
const createPost = async (_, { input }, context) => {
  const { user } = context;

  // Check authentication
  if (!user) {
    return {
      post: null,
      errors: [{
        field: null,
        message: 'You must be logged in to create a post',
        code: 'UNAUTHORIZED',
      }],
      success: false,
    };
  }

  // Validate input
  const errors = [];

  if (!input.title || input.title.trim().length < 3) {
    errors.push({
      field: 'title',
      message: 'Title must be at least 3 characters',
      code: 'VALIDATION_ERROR',
    });
  }

  if (!input.content || input.content.trim().length < 50) {
    errors.push({
      field: 'content',
      message: 'Content must be at least 50 characters',
      code: 'VALIDATION_ERROR',
    });
  }

  if (errors.length > 0) {
    return {
      post: null,
      errors,
      success: false,
    };
  }

  try {
    // Generate slug from title
    const slug = generateSlug(input.title);

    // Check for duplicate slug
    const existing = await context.db.posts.findBySlug(slug);
    if (existing) {
      return {
        post: null,
        errors: [{
          field: 'title',
          message: 'A post with this title already exists',
          code: 'DUPLICATE_ENTRY',
        }],
        success: false,
      };
    }

    // Create post
    const post = await context.db.posts.create({
      ...input,
      slug,
      authorId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Associate tags if provided
    if (input.tagIds && input.tagIds.length > 0) {
      await context.db.postTags.createMany(
        input.tagIds.map(tagId => ({
          postId: post.id,
          tagId,
        }))
      );
    }

    return {
      post,
      errors: [],
      success: true,
    };
  } catch (error) {
    console.error('Error creating post:', error);
    return {
      post: null,
      errors: [{
        field: null,
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      }],
      success: false,
    };
  }
};

module.exports = { createPost };
```

## Schema Documentation

Document your schema with descriptions to make it self-documenting.

```graphql
"""
Represents a user account in the system.
Users can create posts, comments, and have various roles.
"""
type User {
  "Unique identifier for the user"
  id: ID!

  "Email address used for login and notifications"
  email: Email!

  "Unique username for public display"
  username: String!

  "Optional display name shown instead of username"
  displayName: String

  "Short biography or description"
  bio: String

  "URL to user's avatar image"
  avatarUrl: URL

  "User's role determining permissions"
  role: UserRole!

  "When the account was created"
  createdAt: DateTime!

  "When the account was last modified"
  updatedAt: DateTime!

  """
  Posts authored by this user.
  Supports pagination through Relay connection pattern.
  """
  posts(
    "Number of posts to fetch"
    first: Int = 10
    "Cursor for pagination"
    after: String
    "Filter by post status"
    status: PostStatus
  ): PostConnection!
}

"""
Input for creating a new user account.
All required fields must be provided.
"""
input CreateUserInput {
  "Valid email address for the account"
  email: Email!

  """
  Username must be unique and contain only
  alphanumeric characters, underscores, and hyphens.
  Length: 3-30 characters.
  """
  username: String!

  """
  Password must contain at least:
  - 8 characters
  - One uppercase letter
  - One lowercase letter
  - One number
  """
  password: String!

  "Optional display name"
  displayName: String

  "User role (defaults to SUBSCRIBER)"
  role: UserRole = SUBSCRIBER
}
```

## Directives

Directives add metadata and modify schema behavior.

### Built-in Directives

```graphql
type Post {
  id: ID!
  title: String!

  # Skip deprecated field in new clients
  legacySlug: String @deprecated(reason: "Use 'slug' instead")

  slug: String!

  # Include based on condition
  secretField: String @skip(if: $skipSecret)
}
```

### Custom Directives

```graphql
# Directive declarations
directive @auth(requires: UserRole!) on FIELD_DEFINITION
directive @rateLimit(max: Int!, window: Int!) on FIELD_DEFINITION
directive @cacheControl(maxAge: Int!, scope: CacheScope!) on FIELD_DEFINITION

enum CacheScope {
  PUBLIC
  PRIVATE
}

type Query {
  # Public query with caching
  posts(first: Int, after: String): PostConnection!
    @cacheControl(maxAge: 300, scope: PUBLIC)

  # Protected query requiring authentication
  me: User
    @auth(requires: SUBSCRIBER)

  # Admin-only query
  allUsers(first: Int, after: String): UserConnection!
    @auth(requires: ADMIN)
    @rateLimit(max: 100, window: 60)
}

type Mutation {
  # Protected mutations
  createPost(input: CreatePostInput!): CreatePostPayload!
    @auth(requires: AUTHOR)

  deleteUser(id: ID!): DeleteUserPayload!
    @auth(requires: ADMIN)
    @rateLimit(max: 10, window: 60)
}
```

### Implementing Custom Directives

```javascript
// directives/auth.js
const { mapSchema, getDirective, MapperKind } = require('@graphql-tools/utils');
const { defaultFieldResolver } = require('graphql');

const authDirective = (schema, directiveName) => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authDirective = getDirective(schema, fieldConfig, directiveName)?.[0];

      if (authDirective) {
        const { requires } = authDirective;
        const originalResolver = fieldConfig.resolve || defaultFieldResolver;

        fieldConfig.resolve = async (source, args, context, info) => {
          const { user } = context;

          if (!user) {
            throw new Error('Authentication required');
          }

          const roleHierarchy = {
            SUBSCRIBER: 1,
            AUTHOR: 2,
            EDITOR: 3,
            ADMIN: 4,
          };

          if (roleHierarchy[user.role] < roleHierarchy[requires]) {
            throw new Error(`Requires ${requires} role or higher`);
          }

          return originalResolver(source, args, context, info);
        };
      }

      return fieldConfig;
    },
  });
};

module.exports = { authDirective };
```

## Complete Schema Example

Here's a complete schema combining all the patterns:

```graphql
# scalars.graphql
scalar DateTime
scalar Email
scalar URL
scalar JSON

# enums.graphql
enum UserRole {
  ADMIN
  EDITOR
  AUTHOR
  SUBSCRIBER
}

enum PostStatus {
  DRAFT
  PENDING_REVIEW
  PUBLISHED
  ARCHIVED
}

enum SortDirection {
  ASC
  DESC
}

enum PostSortField {
  CREATED_AT
  UPDATED_AT
  PUBLISHED_AT
  TITLE
  VIEW_COUNT
}

enum ErrorCode {
  NOT_FOUND
  UNAUTHORIZED
  VALIDATION_ERROR
  DUPLICATE_ENTRY
  INTERNAL_ERROR
}

# interfaces.graphql
interface Node {
  id: ID!
}

interface Timestamped {
  createdAt: DateTime!
  updatedAt: DateTime!
}

# types.graphql
type User implements Node & Timestamped {
  id: ID!
  email: Email!
  username: String!
  displayName: String
  bio: String
  avatarUrl: URL
  role: UserRole!
  createdAt: DateTime!
  updatedAt: DateTime!
  posts(first: Int, after: String): PostConnection!
}

type Post implements Node & Timestamped {
  id: ID!
  title: String!
  slug: String!
  content: String!
  excerpt: String
  status: PostStatus!
  publishedAt: DateTime
  viewCount: Int!
  author: User!
  tags: [Tag!]!
  comments(first: Int, after: String): CommentConnection!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Tag implements Node {
  id: ID!
  name: String!
  slug: String!
  posts(first: Int, after: String): PostConnection!
}

type Comment implements Node & Timestamped {
  id: ID!
  content: String!
  author: User!
  post: Post!
  parentComment: Comment
  replies(first: Int, after: String): CommentConnection!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# connections.graphql
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type UserEdge {
  node: User!
  cursor: String!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PostEdge {
  node: Post!
  cursor: String!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type CommentEdge {
  node: Comment!
  cursor: String!
}

type CommentConnection {
  edges: [CommentEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

# inputs.graphql
input CreateUserInput {
  email: Email!
  username: String!
  password: String!
  displayName: String
  role: UserRole = SUBSCRIBER
}

input UpdateUserInput {
  displayName: String
  bio: String
  avatarUrl: URL
}

input CreatePostInput {
  title: String!
  content: String!
  excerpt: String
  tagIds: [ID!]
  status: PostStatus = DRAFT
}

input UpdatePostInput {
  title: String
  content: String
  excerpt: String
  tagIds: [ID!]
  status: PostStatus
}

input PostFilterInput {
  status: PostStatus
  authorId: ID
  tagIds: [ID!]
  searchTerm: String
}

input PostSortInput {
  field: PostSortField!
  direction: SortDirection!
}

input AddCommentInput {
  content: String!
  parentCommentId: ID
}

# payloads.graphql
type UserError {
  field: String
  message: String!
  code: ErrorCode!
}

type CreateUserPayload {
  user: User
  errors: [UserError!]!
  success: Boolean!
}

type UpdateUserPayload {
  user: User
  errors: [UserError!]!
  success: Boolean!
}

type CreatePostPayload {
  post: Post
  errors: [UserError!]!
  success: Boolean!
}

type UpdatePostPayload {
  post: Post
  errors: [UserError!]!
  success: Boolean!
}

type DeletePostPayload {
  deletedId: ID
  errors: [UserError!]!
  success: Boolean!
}

type AddCommentPayload {
  comment: Comment
  errors: [UserError!]!
  success: Boolean!
}

# schema.graphql
type Query {
  # Node interface query
  node(id: ID!): Node

  # User queries
  me: User
  user(id: ID!): User
  userByUsername(username: String!): User
  users(first: Int, after: String): UserConnection!

  # Post queries
  post(id: ID!): Post
  postBySlug(slug: String!): Post
  posts(
    first: Int
    after: String
    filter: PostFilterInput
    sort: PostSortInput
  ): PostConnection!

  # Tag queries
  tag(id: ID!): Tag
  tagBySlug(slug: String!): Tag
  tags(first: Int, after: String): [Tag!]!
}

type Mutation {
  # User mutations
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!

  # Post mutations
  createPost(input: CreatePostInput!): CreatePostPayload!
  updatePost(id: ID!, input: UpdatePostInput!): UpdatePostPayload!
  deletePost(id: ID!): DeletePostPayload!
  publishPost(id: ID!): UpdatePostPayload!
  unpublishPost(id: ID!): UpdatePostPayload!

  # Comment mutations
  addComment(postId: ID!, input: AddCommentInput!): AddCommentPayload!
}
```

## Schema Design Best Practices

Follow these guidelines for maintainable schemas:

| Practice | Description |
|----------|-------------|
| Use non-null wisely | Only mark fields as non-null when they should always have a value |
| Prefer specific types | Use enums over strings for known value sets |
| Design for evolution | Add new fields rather than modifying existing ones |
| Use interfaces | Share common fields across related types |
| Consistent naming | Use camelCase for fields, PascalCase for types |
| Input coercion | Validate and transform input data in resolvers |
| Error handling | Return errors in payload types, not exceptions |
| Documentation | Add descriptions to all types and fields |
| Pagination | Use Relay connections for lists |
| Versioning | Deprecate fields before removing them |

## Conclusion

Effective GraphQL schema design requires balancing flexibility with structure. Start with clear type definitions, use interfaces and unions for polymorphism, implement proper pagination with the Relay connection pattern, and maintain consistent mutation patterns. Document your schema thoroughly and evolve it carefully to maintain backward compatibility.

The patterns covered in this guide will help you build schemas that are intuitive for API consumers, maintainable for your team, and scalable as your application grows.
