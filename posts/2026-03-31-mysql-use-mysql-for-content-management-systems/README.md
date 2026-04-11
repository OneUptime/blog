# How to Use MySQL for Content Management Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CMS, Schema, Full-Text Search, Slug

Description: Learn how to design a MySQL schema for a content management system covering posts, taxonomies, versioning, and full-text search for editorial workflows.

---

MySQL powers many of the world's most-used content management systems, including WordPress, Drupal, and Craft CMS. Designing a CMS schema well means handling flexible content types, hierarchical taxonomy, URL slugs, content versioning, and full-text search.

## Core Content Schema

```sql
CREATE TABLE content_types (
  id    SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug  VARCHAR(100) NOT NULL,
  name  VARCHAR(200) NOT NULL,
  UNIQUE KEY uq_slug (slug)
);

INSERT INTO content_types (slug, name) VALUES
  ('post', 'Blog Post'), ('page', 'Page'), ('product', 'Product');

CREATE TABLE content (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_type_id SMALLINT UNSIGNED NOT NULL,
  slug            VARCHAR(300) NOT NULL,
  title           VARCHAR(300) NOT NULL,
  body            LONGTEXT,
  excerpt         TEXT,
  status          ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  author_id       BIGINT UNSIGNED NOT NULL,
  published_at    DATETIME,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_slug (slug),
  INDEX idx_type_status_published (content_type_id, status, published_at),
  FULLTEXT INDEX ft_title_body (title, body),
  CONSTRAINT fk_content_type FOREIGN KEY (content_type_id) REFERENCES content_types (id)
) ENGINE=InnoDB;
```

## Taxonomy (Categories and Tags)

Use a flexible taxonomy system:

```sql
CREATE TABLE taxonomies (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug      VARCHAR(100) NOT NULL,
  name      VARCHAR(200) NOT NULL,
  parent_id INT UNSIGNED,
  UNIQUE KEY uq_slug (slug),
  CONSTRAINT fk_tax_parent FOREIGN KEY (parent_id) REFERENCES taxonomies (id)
);

CREATE TABLE content_taxonomies (
  content_id  BIGINT UNSIGNED NOT NULL,
  taxonomy_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (content_id, taxonomy_id),
  INDEX idx_taxonomy_id (taxonomy_id)
);
```

## Content Versioning

Store each revision as a row in a separate table:

```sql
CREATE TABLE content_revisions (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT UNSIGNED NOT NULL,
  version    INT UNSIGNED NOT NULL,
  title      VARCHAR(300) NOT NULL,
  body       LONGTEXT,
  editor_id  BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_content_version (content_id, version),
  CONSTRAINT fk_revision_content FOREIGN KEY (content_id) REFERENCES content (id)
);
```

Save a revision before every update:

```sql
INSERT INTO content_revisions (content_id, version, title, body, editor_id)
SELECT id, (SELECT COALESCE(MAX(version), 0) + 1 FROM content_revisions WHERE content_id = 1),
       title, body, 99
FROM content WHERE id = 1;

UPDATE content SET title = 'Updated Title', body = '...', updated_at = NOW() WHERE id = 1;
```

## Querying Published Content

```sql
SELECT c.id, c.slug, c.title, c.excerpt, c.published_at,
       GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') AS tags
FROM content c
LEFT JOIN content_taxonomies ct ON ct.content_id = c.id
LEFT JOIN taxonomies t ON t.id = ct.taxonomy_id
WHERE c.content_type_id = 1
  AND c.status = 'published'
  AND c.published_at <= NOW()
GROUP BY c.id
ORDER BY c.published_at DESC
LIMIT 10;
```

## Full-Text Search

```sql
SELECT id, slug, title,
  MATCH(title, body) AGAINST('mysql performance' IN BOOLEAN MODE) AS relevance
FROM content
WHERE status = 'published'
  AND MATCH(title, body) AGAINST('mysql performance' IN BOOLEAN MODE)
ORDER BY relevance DESC
LIMIT 20;
```

## Summary

A MySQL CMS schema covers content with status and slug management, flexible taxonomy through a junction table, revision history for editorial rollback, and full-text search via FULLTEXT indexes. The combination of a composite index on `(content_type_id, status, published_at)` and the FULLTEXT index supports both the listing queries that power editorial dashboards and the search queries that serve readers.
