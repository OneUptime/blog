# Validation Summary: How to Implement Soft Deletes in Laravel

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- PHP
- Laravel (Eloquent ORM, Migrations, Schema Builder, Scheduler, Artisan, API Resources, Testing/PHPUnit)
- MySQL / PostgreSQL (unique index NULL semantics)
- Carbon (date handling)

## Sources Consulted
- Laravel Eloquent — Soft Deleting docs: https://laravel.com/docs/10.x/eloquent#soft-deleting
- Laravel Eloquent — Global Scopes docs: https://laravel.com/docs/10.x/eloquent#global-scopes
- Laravel framework source: `Illuminate\Database\Eloquent\SoftDeletes` and `Illuminate\Database\Eloquent\SoftDeletingScope`
- Laravel framework source: `Illuminate\Database\Schema\Blueprint` (`softDeletes()`, `dropSoftDeletes()`)
- Laravel framework source: `Illuminate\Database\Eloquent\Model::saveQuietly()` (added in Laravel 8)
- Laravel framework source: `Illuminate\Database\Eloquent\Builder::forceDelete()`
- SQL standard / MySQL InnoDB / PostgreSQL behavior for NULLs in unique indexes

## Issues Found

1. **Missing `Comment` model import in the test file.** The test cases use `Comment::factory()`, `Comment::where(...)`, and `Comment::withTrashed()` but the imports list only `Post`, `User`, `RefreshDatabase`, and `TestCase`. Added `use App\Models\Comment;` so the file would actually compile.

2. **Custom `VisibleToUserScope` global scope would not work as written.** When a model uses the `SoftDeletes` trait, `SoftDeletingScope` is registered automatically and appends `WHERE deleted_at IS NULL` to every query. Laravel ANDs global scopes together (each scope appends to the same builder), so adding another global scope with `whereNotNull('deleted_at')` in an OR branch cannot match — the outer AND from `SoftDeletingScope` forces `deleted_at IS NULL` regardless. Fixed by calling `$builder->withoutGlobalScope(SoftDeletingScope::class)` at the top of the custom scope's `apply()` method and importing the class.

3. **`unique(['slug', 'deleted_at'])` does not actually enforce uniqueness on active rows in MySQL/PostgreSQL.** Per the SQL standard, NULLs in a unique index are considered distinct on both MySQL (InnoDB) and PostgreSQL. Two active rows with the same `slug` and `deleted_at = NULL` will both be accepted, defeating the original purpose of the unique constraint. Added an inline comment documenting this caveat and showing the PostgreSQL partial-unique-index alternative. The technique is still useful on SQL Server (which treats NULLs as equal in unique indexes), so the example was kept but annotated.

## Review Notes

- The post does not pin a specific Laravel version. The migration anonymous-class syntax (`return new class extends Migration`) requires Laravel 8+. The `app/Console/Kernel.php` scheduling example matches Laravel 10 and earlier; in Laravel 11+ scheduling moved to `routes/console.php` (or `bootstrap/app.php` via `withSchedule`). Code still works for the version it targets and is a documented older pattern; not changed.
- Restoration of related records uses a `±1 second` (or `±5 second`) window on `deleted_at` to identify "related" deletions. This is a heuristic — under load or clock skew it can mis-restore. The post acknowledges this implicitly; could be hardened in future revisions by tracking a parent deletion ID.
- The cascade tests assume the `Comment` model also uses the `SoftDeletes` trait (otherwise `Comment::withTrashed()` would not exist). This is implied by the cascading example but not explicitly shown in the model definitions. Not changed; acceptable for a tutorial.
- `protected $casts = ['status' => 'string']` is effectively a no-op (string is the default) and the `deleted_at => 'datetime'` cast is added automatically by the trait's `initializeSoftDeletes()`. Kept as-is — accurate and not misleading.
- The Solution 2 slug-rewriting trick saves twice on delete (once to mutate the slug via `saveQuietly()`, once for the soft-delete itself). This is functionally correct but slightly wasteful; not a bug.
