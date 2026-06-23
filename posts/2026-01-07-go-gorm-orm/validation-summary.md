# Validation Summary: How to Use GORM Effectively in Go

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Go
- GORM
- PostgreSQL
- SQL database migrations
- golang-migrate

## Sources Consulted
- GORM Guides: https://gorm.io/docs/
- GORM Connecting to a Database: https://gorm.io/docs/connecting_to_the_database.html
- GORM Declaring Models and field tags: https://gorm.io/docs/models.html
- GORM Serializer: https://gorm.io/docs/serializer.html
- GORM Migration and Migrator: https://gorm.io/docs/migration.html
- GORM Indexes: https://gorm.io/docs/indexes.html
- GORM Constraints: https://gorm.io/docs/constraints.html
- GORM Preloading: https://gorm.io/docs/preload.html
- GORM Transactions: https://gorm.io/docs/transactions.html
- GORM Hooks: https://gorm.io/docs/hooks.html
- golang-migrate repository and package documentation: https://github.com/golang-migrate/migrate and https://pkg.go.dev/github.com/golang-migrate/migrate/v4

## Issues Found
- JSON map fields used `gorm:"type:jsonb"` without a serializer or custom Scanner/Valuer. Updated `Preferences` and `SocialLinks` to use `gorm:"serializer:json;type:jsonb"` so GORM can serialize and deserialize the map values correctly.
- The AutoMigrate notes reflected older/incomplete behavior. Updated them to match current GORM documentation: AutoMigrate creates missing foreign keys, constraints, columns, and indexes, and may change existing column types for size/precision or nullable changes; it does not delete unused columns.
- The `CreateIndexes` example attempted to create `idx_users_name` through GORM's Migrator even though that index was not declared on the model. Replaced it with explicit `CREATE INDEX IF NOT EXISTS` SQL for the composite index.
- The manual transaction example created a user without required fields from the earlier model and then hard-coded `Profile.UserID = 1`. Updated it to create a user with required fields and use the generated `user.ID` for the profile.
- The `Save` example omitted GORM's upsert-like caveat. Updated the comment to note that `Save` can insert when no primary key is set.
- A few snippets had missing or stale imports after review. Added `time`, `gorm.io/gorm/clause`, `fmt`, and `strings` where needed, and removed an unused `errors` import from the create-operation snippet.

## Review Notes
Some examples are intentionally illustrative and reference fields or types not fully defined in the post, such as `Credits`, `Order`, `Product`, and hook helper functions. They are acceptable as focused examples, but a future pass could make the snippets compile as a complete sample project.
