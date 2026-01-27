# How to Use Rails with PostgreSQL Full-Text Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ruby on Rails, PostgreSQL, Full-Text Search, Database, Search, Performance

Description: Learn how to implement powerful full-text search in your Rails application using PostgreSQL's built-in search capabilities, from basic tsvector queries to advanced features like ranking, highlighting, and autocomplete.

---

> PostgreSQL full-text search gives you 90% of Elasticsearch's power with 0% of the operational overhead. Before reaching for a separate search service, leverage what your database already provides.

Full-text search is a common requirement for modern web applications. While dedicated search engines like Elasticsearch are powerful, they add operational complexity. PostgreSQL's built-in full-text search is surprisingly capable and integrates seamlessly with Rails. This guide walks you through implementing robust search functionality using only PostgreSQL.

## Understanding tsvector and tsquery

PostgreSQL full-text search revolves around two data types: `tsvector` and `tsquery`. Understanding these is essential before implementing search.

- **tsvector**: A sorted list of distinct lexemes (normalized words) with position information
- **tsquery**: A search query containing lexemes combined with boolean operators

```ruby
# You can experiment with these in the Rails console
# Convert text to tsvector
ActiveRecord::Base.connection.execute("SELECT to_tsvector('english', 'The quick brown fox jumps over the lazy dog')").first
# Returns: "'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2"

# Create a tsquery for searching
ActiveRecord::Base.connection.execute("SELECT to_tsquery('english', 'quick & fox')").first
# Returns: "'quick' & 'fox'"

# Match a tsvector against a tsquery
ActiveRecord::Base.connection.execute("SELECT to_tsvector('english', 'The quick brown fox') @@ to_tsquery('english', 'quick & fox')").first
# Returns: true
```

The `@@` operator is the match operator that returns true if a tsvector matches a tsquery.

## Setting Up pg_search Gem

While you can use raw SQL, the `pg_search` gem provides a clean Ruby interface for PostgreSQL full-text search.

```ruby
# Gemfile
gem 'pg_search'

# Run bundle install
# bundle install
```

### Basic Model Setup

```ruby
# app/models/article.rb
class Article < ApplicationRecord
  # Include the pg_search module
  include PgSearch::Model

  # Define a basic search scope
  # This creates an Article.search_by_title_and_content method
  pg_search_scope :search_by_title_and_content,
    against: [:title, :content],
    using: {
      tsearch: {
        # Use English dictionary for stemming
        dictionary: 'english',
        # Prefix matching allows partial word matches
        prefix: true
      }
    }
end
```

Now you can search articles:

```ruby
# Find articles matching the search term
# This handles stemming, so "running" matches "run", "runs", "runner"
Article.search_by_title_and_content('postgresql database')

# Chain with other scopes
Article.published.search_by_title_and_content('rails').order(created_at: :desc)
```

## Creating Migrations for Search Indexes

For production performance, you need GIN (Generalized Inverted Index) indexes on your searchable columns.

### Basic Index Migration

```ruby
# db/migrate/20260127000001_add_search_index_to_articles.rb
class AddSearchIndexToArticles < ActiveRecord::Migration[7.1]
  # Disable DDL transactions for concurrent index creation
  # This prevents locking the table during index creation
  disable_ddl_transaction!

  def up
    # Create a GIN index on the tsvector of title and content
    # CONCURRENTLY allows reads/writes during index creation
    execute <<-SQL
      CREATE INDEX CONCURRENTLY index_articles_on_search
      ON articles
      USING gin(
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
      );
    SQL
  end

  def down
    # Remove the index
    execute <<-SQL
      DROP INDEX CONCURRENTLY IF EXISTS index_articles_on_search;
    SQL
  end
end
```

### Storing tsvector in a Dedicated Column

For better performance with large tables, store the tsvector in a dedicated column:

```ruby
# db/migrate/20260127000002_add_searchable_column_to_articles.rb
class AddSearchableColumnToArticles < ActiveRecord::Migration[7.1]
  def change
    # Add a column to store the precomputed tsvector
    add_column :articles, :searchable, :tsvector

    # Add a GIN index on the searchable column
    add_index :articles, :searchable, using: :gin
  end
end
```

```ruby
# db/migrate/20260127000003_create_search_trigger_for_articles.rb
class CreateSearchTriggerForArticles < ActiveRecord::Migration[7.1]
  def up
    # Create a function that updates the searchable column
    execute <<-SQL
      CREATE OR REPLACE FUNCTION articles_search_trigger() RETURNS trigger AS $$
      BEGIN
        -- Combine title (weighted A) and content (weighted B) into searchable column
        -- Weight A terms rank higher than weight B terms
        NEW.searchable :=
          setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    SQL

    # Create trigger that calls the function on insert or update
    execute <<-SQL
      CREATE TRIGGER articles_search_update
      BEFORE INSERT OR UPDATE OF title, content
      ON articles
      FOR EACH ROW
      EXECUTE FUNCTION articles_search_trigger();
    SQL

    # Backfill existing records
    execute <<-SQL
      UPDATE articles SET searchable =
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'B');
    SQL
  end

  def down
    execute "DROP TRIGGER IF EXISTS articles_search_update ON articles;"
    execute "DROP FUNCTION IF EXISTS articles_search_trigger();"
  end
end
```

Update your model to use the stored tsvector:

```ruby
# app/models/article.rb
class Article < ApplicationRecord
  include PgSearch::Model

  pg_search_scope :search_by_title_and_content,
    against: [:title, :content],
    using: {
      tsearch: {
        dictionary: 'english',
        prefix: true,
        # Use the precomputed tsvector column for better performance
        tsvector_column: 'searchable'
      }
    }
end
```

## Ranking Search Results

PostgreSQL provides two ranking functions: `ts_rank` and `ts_rank_cd`. The pg_search gem handles this automatically, but you can customize ranking behavior.

```ruby
# app/models/article.rb
class Article < ApplicationRecord
  include PgSearch::Model

  # Search with custom ranking
  pg_search_scope :ranked_search,
    against: {
      # Weight title matches 3x higher than content
      title: 'A',
      content: 'B'
    },
    using: {
      tsearch: {
        dictionary: 'english',
        prefix: true,
        # Normalization options:
        # 0 = default (no normalization)
        # 1 = divides by 1 + log(document length)
        # 2 = divides by document length
        # 4 = divides by mean harmonic distance between extents
        # 8 = divides by number of unique words
        # 16 = divides by 1 + log(unique words)
        # 32 = divides by itself + 1
        normalization: 2
      }
    },
    # Rank by weighted tsearch results
    ranked_by: ':tsearch'
end
```

For more control, you can write custom ranking SQL:

```ruby
# app/models/concerns/searchable.rb
module Searchable
  extend ActiveSupport::Concern

  included do
    scope :search_with_ranking, ->(query) {
      # Sanitize the search query
      sanitized_query = sanitize_sql_like(query)

      # Build the search with custom ranking
      select("#{table_name}.*, ts_rank_cd(searchable, plainto_tsquery('english', #{connection.quote(sanitized_query)})) AS search_rank")
        .where("searchable @@ plainto_tsquery('english', ?)", sanitized_query)
        .order('search_rank DESC')
    }
  end
end
```

## Highlighting Search Results

Highlighting shows users why a result matched their query by marking matching terms.

```ruby
# app/models/article.rb
class Article < ApplicationRecord
  include PgSearch::Model

  pg_search_scope :search_with_highlights,
    against: [:title, :content],
    using: {
      tsearch: {
        dictionary: 'english',
        prefix: true,
        # Enable highlighting
        highlight: {
          # HTML tags to wrap matched terms
          start_sel: '<mark>',
          stop_sel: '</mark>',
          # Maximum length of highlighted fragment
          max_words: 35,
          min_words: 15,
          # Short words to skip
          short_word: 3,
          # Number of fragments to return
          max_fragments: 3,
          # Fragment delimiter
          fragment_delimiter: '...'
        }
      }
    }
end
```

Using highlights in your controller and view:

```ruby
# app/controllers/search_controller.rb
class SearchController < ApplicationController
  def index
    if params[:q].present?
      # Perform search with highlights
      @results = Article.search_with_highlights(params[:q])
        .with_pg_search_highlight
        .page(params[:page])
    else
      @results = Article.none
    end
  end
end
```

```erb
<%# app/views/search/index.html.erb %>
<% @results.each do |article| %>
  <div class="search-result">
    <h3><%= link_to article.title, article %></h3>
    <%# pg_search_highlight contains the highlighted snippet %>
    <p><%= raw article.pg_search_highlight %></p>
  </div>
<% end %>
```

## Implementing Autocomplete

Autocomplete requires fast prefix matching. Here's how to implement it efficiently:

```ruby
# db/migrate/20260127000004_create_search_suggestions.rb
class CreateSearchSuggestions < ActiveRecord::Migration[7.1]
  def change
    # Create a dedicated table for autocomplete suggestions
    create_table :search_suggestions do |t|
      t.string :term, null: false
      t.integer :popularity, default: 0
      t.string :category

      t.timestamps
    end

    # Use pg_trgm extension for trigram-based similarity matching
    enable_extension 'pg_trgm'

    # GIN index with trigram ops for fast prefix matching
    add_index :search_suggestions, :term, using: :gin, opclass: :gin_trgm_ops
    add_index :search_suggestions, [:category, :term]
  end
end
```

```ruby
# app/models/search_suggestion.rb
class SearchSuggestion < ApplicationRecord
  # Find suggestions matching a prefix
  # Uses trigram similarity for fuzzy matching
  scope :autocomplete, ->(prefix) {
    where("term ILIKE ?", "#{sanitize_sql_like(prefix)}%")
      .or(where("similarity(term, ?) > 0.3", prefix))
      .order(Arel.sql("popularity DESC, similarity(term, #{connection.quote(prefix)}) DESC"))
      .limit(10)
  }

  # Update suggestions based on actual searches
  def self.record_search(term, category: nil)
    suggestion = find_or_initialize_by(term: term.downcase.strip, category: category)
    suggestion.popularity += 1
    suggestion.save
  end
end
```

```ruby
# app/controllers/autocomplete_controller.rb
class AutocompleteController < ApplicationController
  def index
    # Return JSON suggestions for AJAX requests
    suggestions = SearchSuggestion.autocomplete(params[:q])
      .pluck(:term)

    render json: suggestions
  end
end
```

For article title autocomplete without a separate table:

```ruby
# app/models/article.rb
class Article < ApplicationRecord
  # Fast prefix autocomplete using trigrams
  scope :title_autocomplete, ->(prefix) {
    where("title ILIKE ?", "#{sanitize_sql_like(prefix)}%")
      .select(:id, :title)
      .order(:title)
      .limit(10)
  }
end
```

## Multi-Column Search with Weights

Searching across multiple columns with different weights allows you to prioritize matches in certain fields.

```ruby
# app/models/product.rb
class Product < ApplicationRecord
  include PgSearch::Model

  # Search across multiple columns with different weights
  pg_search_scope :search_all_fields,
    against: {
      # A = highest weight (1.0)
      name: 'A',
      # B = high weight (0.4)
      sku: 'B',
      # C = medium weight (0.2)
      description: 'C',
      # D = low weight (0.1)
      category_name: 'D'
    },
    # Also search associated models
    associated_against: {
      brand: [:name],
      tags: [:name]
    },
    using: {
      tsearch: {
        dictionary: 'english',
        prefix: true
      },
      # Add trigram matching for typo tolerance
      trigram: {
        # Minimum similarity threshold (0-1)
        threshold: 0.3
      }
    }
end
```

For complex multi-table searches:

```ruby
# app/models/concerns/global_searchable.rb
module GlobalSearchable
  extend ActiveSupport::Concern

  included do
    include PgSearch::Model

    # Define what makes this model globally searchable
    def self.global_search_config
      raise NotImplementedError, "Define global_search_config in your model"
    end
  end
end

# app/models/article.rb
class Article < ApplicationRecord
  include GlobalSearchable

  def self.global_search_config
    {
      content: -> { "#{title} #{content}" },
      category: 'article',
      url: ->(record) { Rails.application.routes.url_helpers.article_path(record) }
    }
  end
end

# app/models/product.rb
class Product < ApplicationRecord
  include GlobalSearchable

  def self.global_search_config
    {
      content: -> { "#{name} #{description} #{sku}" },
      category: 'product',
      url: ->(record) { Rails.application.routes.url_helpers.product_path(record) }
    }
  end
end
```

Using PgSearch multisearch for global search:

```ruby
# config/initializers/pg_search.rb
PgSearch.multisearch_options = {
  using: {
    tsearch: {
      dictionary: 'english',
      prefix: true
    }
  }
}

# app/models/article.rb
class Article < ApplicationRecord
  include PgSearch::Model

  # Enable multisearch for this model
  multisearchable against: [:title, :content],
    # Only index published articles
    if: :published?
end

# app/models/product.rb
class Product < ApplicationRecord
  include PgSearch::Model

  multisearchable against: [:name, :description, :sku],
    if: :active?
end
```

```ruby
# Search across all multisearchable models
PgSearch.multisearch('ruby programming')
# Returns PgSearch::Document records with searchable association
```

## Best Practices Summary

When implementing PostgreSQL full-text search in Rails, keep these guidelines in mind:

1. **Start simple**: Begin with basic tsearch before adding trigrams or phrase search. Profile performance to identify if you need more complexity.

2. **Use GIN indexes**: Always create GIN indexes on searchable columns. Without them, searches perform full table scans.

3. **Store tsvector for large tables**: For tables over 100k rows, store precomputed tsvector in a dedicated column with a trigger to keep it updated.

4. **Choose the right dictionary**: Use language-specific dictionaries (english, spanish, german) for proper stemming. Use 'simple' dictionary for code or technical content.

5. **Weight your columns**: Give higher weights to more important fields (title vs body). Users expect title matches to rank higher.

6. **Add trigram search for typo tolerance**: Enable pg_trgm extension and combine with tsearch for fuzzy matching.

7. **Paginate results**: Never return unbounded search results. Use cursor-based pagination for large result sets.

8. **Monitor query performance**: Use EXPLAIN ANALYZE on your search queries. Watch for sequential scans that indicate missing indexes.

9. **Consider search UX**: Implement highlighting so users understand why results matched. Add autocomplete for better discoverability.

10. **Know when to scale out**: PostgreSQL full-text search works well up to millions of documents. Beyond that, or for complex faceting and aggregations, consider dedicated search infrastructure.

---

PostgreSQL full-text search is a powerful tool that eliminates the need for separate search infrastructure in many applications. Combined with the pg_search gem, Rails developers can implement sophisticated search features with minimal complexity. For monitoring your search performance and tracking slow queries, check out [OneUptime](https://oneuptime.com) to ensure your search remains fast and reliable in production.
