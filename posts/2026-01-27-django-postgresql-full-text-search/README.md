# How to Use Django with PostgreSQL Full-Text Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Django, Python, PostgreSQL, Full-Text Search, Search, Database

Description: Learn how to implement full-text search in Django using PostgreSQL's built-in capabilities including search vectors, ranking, and search configuration.

---

> PostgreSQL's full-text search is often overlooked in favor of dedicated search engines like Elasticsearch. But for most applications, it provides everything you need without adding infrastructure complexity. Django makes it easy to use with its built-in postgres contrib module.

Full-text search goes beyond simple LIKE queries. It understands language, handles stemming (so "running" matches "run"), ignores stop words, and ranks results by relevance. PostgreSQL has had this built-in since version 8.3, and Django has supported it since version 1.10.

---

## Prerequisites

Before starting, ensure you have PostgreSQL as your database backend and Django's postgres contrib module available.

```python
# settings.py
# PostgreSQL is required for full-text search features
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'your_database',
        'USER': 'your_user',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Add django.contrib.postgres to enable full-text search features
INSTALLED_APPS = [
    # ... other apps
    'django.contrib.postgres',
]
```

---

## Sample Model

We will use a simple Article model throughout this guide. This represents a typical content model where full-text search is commonly needed.

```python
# models.py
from django.db import models
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex

class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.CharField(max_length=100)
    published_at = models.DateTimeField(auto_now_add=True)

    # SearchVectorField stores pre-computed search vectors for performance
    # This field is optional but recommended for large datasets
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        indexes = [
            # GIN index dramatically speeds up full-text search queries
            GinIndex(fields=['search_vector']),
        ]

    def __str__(self):
        return self.title
```

---

## Basic Search with SearchVector and SearchQuery

Django provides SearchVector to convert text into a searchable format and SearchQuery to parse user input. Together they enable simple but powerful full-text search.

```python
# views.py
from django.contrib.postgres.search import SearchVector, SearchQuery
from .models import Article

def search_articles(request):
    query = request.GET.get('q', '')

    if query:
        # SearchVector converts specified fields into a tsvector
        # SearchQuery converts the search term into a tsquery
        articles = Article.objects.annotate(
            search=SearchVector('title', 'content')
        ).filter(
            search=SearchQuery(query)
        )
    else:
        articles = Article.objects.none()

    return render(request, 'search_results.html', {
        'articles': articles,
        'query': query
    })
```

You can search across multiple fields by adding them to SearchVector:

```python
# Search across title, content, and author fields
articles = Article.objects.annotate(
    search=SearchVector('title', 'content', 'author')
).filter(
    search=SearchQuery(query)
)
```

---

## Ranking Results with SearchRank

SearchRank assigns a relevance score to each result. This lets you sort results so the most relevant items appear first.

```python
# views.py
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank

def search_articles_ranked(request):
    query = request.GET.get('q', '')

    if query:
        # Create the search vector and query objects
        search_vector = SearchVector('title', 'content')
        search_query = SearchQuery(query)

        # Annotate with both search vector and rank
        # Then filter by search match and order by relevance
        articles = Article.objects.annotate(
            search=search_vector,
            rank=SearchRank(search_vector, search_query)
        ).filter(
            search=search_query
        ).order_by(
            '-rank'  # Highest relevance first
        )
    else:
        articles = Article.objects.none()

    return render(request, 'search_results.html', {
        'articles': articles,
        'query': query
    })
```

---

## Weighting Search Fields

Not all fields are equally important. Use weights to prioritize matches in certain fields. PostgreSQL supports four weights: A (highest), B, C, and D (lowest).

```python
# views.py
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank

def search_with_weights(request):
    query = request.GET.get('q', '')

    if query:
        # Assign weights to different fields
        # Weight 'A' for title means title matches are most important
        # Weight 'B' for content means content matches are less important
        search_vector = SearchVector('title', weight='A') + \
                       SearchVector('content', weight='B') + \
                       SearchVector('author', weight='C')

        search_query = SearchQuery(query)

        articles = Article.objects.annotate(
            rank=SearchRank(search_vector, search_query)
        ).filter(
            rank__gte=0.1  # Filter out very low relevance matches
        ).order_by('-rank')
    else:
        articles = Article.objects.none()

    return render(request, 'search_results.html', {
        'articles': articles,
        'query': query
    })
```

---

## Highlighting Search Matches

SearchHeadline shows snippets of text with the search terms highlighted. This helps users see why a result matched their query.

```python
# views.py
from django.contrib.postgres.search import (
    SearchVector, SearchQuery, SearchRank, SearchHeadline
)

def search_with_highlights(request):
    query = request.GET.get('q', '')

    if query:
        search_query = SearchQuery(query)

        articles = Article.objects.annotate(
            search=SearchVector('title', 'content'),
            rank=SearchRank(SearchVector('title', 'content'), search_query),
            # SearchHeadline creates a snippet with highlighted matches
            # start_sel and stop_sel define the highlight markers
            headline=SearchHeadline(
                'content',
                search_query,
                start_sel='<mark>',
                stop_sel='</mark>',
                max_words=35,        # Maximum words in the snippet
                min_words=15,        # Minimum words in the snippet
                max_fragments=3,     # Number of snippets to show
            )
        ).filter(
            search=search_query
        ).order_by('-rank')
    else:
        articles = Article.objects.none()

    return render(request, 'search_results.html', {
        'articles': articles,
        'query': query
    })
```

In your template, use the `safe` filter to render the HTML:

```html
<!-- search_results.html -->
{% for article in articles %}
<div class="result">
    <h3>{{ article.title }}</h3>
    <p>{{ article.headline|safe }}</p>
</div>
{% endfor %}
```

---

## Search Configuration for Language Support

PostgreSQL full-text search supports different languages for stemming and stop words. The default is 'english', but you can configure this for other languages.

```python
# views.py
from django.contrib.postgres.search import SearchVector, SearchQuery

def search_multilingual(request):
    query = request.GET.get('q', '')
    language = request.GET.get('lang', 'english')

    # Supported languages include: danish, dutch, english, finnish,
    # french, german, hungarian, italian, norwegian, portuguese,
    # romanian, russian, simple, spanish, swedish, turkish

    if query:
        articles = Article.objects.annotate(
            search=SearchVector(
                'title', 'content',
                config=language  # Use language-specific configuration
            )
        ).filter(
            search=SearchQuery(query, config=language)
        )
    else:
        articles = Article.objects.none()

    return render(request, 'search_results.html', {
        'articles': articles,
        'query': query
    })
```

---

## Trigram Similarity for Fuzzy Search

Trigram similarity finds matches even when the search term has typos or slight variations. This requires the pg_trgm extension in PostgreSQL.

First, enable the extension:

```python
# migrations/0002_enable_trigram.py
from django.db import migrations
from django.contrib.postgres.operations import TrigramExtension

class Migration(migrations.Migration):
    dependencies = [
        ('your_app', '0001_initial'),
    ]

    operations = [
        TrigramExtension(),  # Enables pg_trgm extension
    ]
```

Then use it in your searches:

```python
# views.py
from django.contrib.postgres.search import TrigramSimilarity, TrigramWordSimilarity

def fuzzy_search(request):
    query = request.GET.get('q', '')

    if query:
        # TrigramSimilarity compares the entire field to the query
        # Returns a similarity score between 0 and 1
        articles = Article.objects.annotate(
            similarity=TrigramSimilarity('title', query)
        ).filter(
            similarity__gt=0.3  # Threshold for matches
        ).order_by('-similarity')
    else:
        articles = Article.objects.none()

    return render(request, 'search_results.html', {
        'articles': articles,
        'query': query
    })

def word_similarity_search(request):
    query = request.GET.get('q', '')

    if query:
        # TrigramWordSimilarity is better for matching individual words
        # within longer text fields
        articles = Article.objects.annotate(
            similarity=TrigramWordSimilarity(query, 'title')
        ).filter(
            similarity__gt=0.3
        ).order_by('-similarity')
    else:
        articles = Article.objects.none()

    return render(request, 'search_results.html', {
        'articles': articles,
        'query': query
    })
```

---

## GIN Indexes for Performance

Without an index, every full-text search scans the entire table. GIN indexes make searches fast even on large datasets.

```python
# models.py
from django.db import models
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex

class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.CharField(max_length=100)
    published_at = models.DateTimeField(auto_now_add=True)

    # Pre-computed search vector for fast searching
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        indexes = [
            # GIN index on the search_vector field
            GinIndex(fields=['search_vector']),

            # Trigram index for fuzzy search on title
            # Requires: from django.contrib.postgres.indexes import GistIndex
            # and 'gin_trgm_ops' opclass
            GinIndex(
                name='title_trgm_idx',
                fields=['title'],
                opclasses=['gin_trgm_ops'],
            ),
        ]
```

For dynamically generated search vectors, you can create a functional index:

```python
# migrations/0003_functional_search_index.py
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('your_app', '0002_enable_trigram'),
    ]

    operations = [
        migrations.RunSQL(
            # Create GIN index on combined search vector
            sql="""
            CREATE INDEX article_search_idx ON your_app_article
            USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));
            """,
            reverse_sql="DROP INDEX IF EXISTS article_search_idx;",
        ),
    ]
```

---

## Keeping Search Vectors Updated

If you use a SearchVectorField, you need to keep it synchronized with your data. There are two approaches: signals and database triggers.

### Using Django Signals

```python
# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.postgres.search import SearchVector
from .models import Article

@receiver(post_save, sender=Article)
def update_search_vector(sender, instance, **kwargs):
    # Update search vector after save
    # Use update() to avoid triggering the signal again
    Article.objects.filter(pk=instance.pk).update(
        search_vector=SearchVector('title', weight='A') +
                      SearchVector('content', weight='B') +
                      SearchVector('author', weight='C')
    )
```

Register the signal in your app config:

```python
# apps.py
from django.apps import AppConfig

class YourAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'your_app'

    def ready(self):
        import your_app.signals  # Import signals to register them
```

### Using Database Triggers

Database triggers are more reliable for high-volume updates:

```python
# migrations/0004_search_trigger.py
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('your_app', '0003_functional_search_index'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            -- Function to update search vector
            CREATE OR REPLACE FUNCTION article_search_trigger() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector :=
                    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B') ||
                    setweight(to_tsvector('english', coalesce(NEW.author, '')), 'C');
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql;

            -- Trigger to call the function on insert or update
            CREATE TRIGGER article_search_update
            BEFORE INSERT OR UPDATE ON your_app_article
            FOR EACH ROW EXECUTE FUNCTION article_search_trigger();
            """,
            reverse_sql="""
            DROP TRIGGER IF EXISTS article_search_update ON your_app_article;
            DROP FUNCTION IF EXISTS article_search_trigger();
            """,
        ),
    ]
```

---

## Combining Full-Text Search with Trigram Similarity

For the best user experience, combine full-text search for relevance with trigram similarity for typo tolerance.

```python
# views.py
from django.db.models import F, Value
from django.db.models.functions import Greatest
from django.contrib.postgres.search import (
    SearchVector, SearchQuery, SearchRank, TrigramSimilarity
)

def combined_search(request):
    query = request.GET.get('q', '')

    if query:
        search_vector = SearchVector('title', weight='A') + \
                       SearchVector('content', weight='B')
        search_query = SearchQuery(query)

        # Combine full-text rank with trigram similarity
        # This handles both relevant matches and typo tolerance
        articles = Article.objects.annotate(
            # Full-text search rank (0 to 1)
            fts_rank=SearchRank(search_vector, search_query),
            # Trigram similarity on title (0 to 1)
            trgm_similarity=TrigramSimilarity('title', query),
            # Combined score: weighted average
            combined_score=F('fts_rank') * 0.7 + F('trgm_similarity') * 0.3
        ).filter(
            # Match if either full-text or trigram finds something
            models.Q(fts_rank__gt=0.01) | models.Q(trgm_similarity__gt=0.3)
        ).order_by('-combined_score')
    else:
        articles = Article.objects.none()

    return render(request, 'search_results.html', {
        'articles': articles,
        'query': query
    })
```

---

## Advanced Search with Phrase and Boolean Queries

PostgreSQL supports phrase search and boolean operators for advanced search queries.

```python
# views.py
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank

def advanced_search(request):
    query = request.GET.get('q', '')
    search_type = request.GET.get('type', 'plain')

    if query:
        # Different search types for different use cases
        if search_type == 'phrase':
            # Phrase search: matches exact phrase "hello world"
            search_query = SearchQuery(query, search_type='phrase')
        elif search_type == 'raw':
            # Raw search: allows PostgreSQL operators
            # Example: "python & django" or "python | ruby"
            search_query = SearchQuery(query, search_type='raw')
        elif search_type == 'websearch':
            # Websearch: Google-like syntax
            # Example: "python django -flask" (exclude flask)
            # Example: '"exact phrase"' (phrase match)
            search_query = SearchQuery(query, search_type='websearch')
        else:
            # Plain search: standard full-text search
            search_query = SearchQuery(query, search_type='plain')

        search_vector = SearchVector('title', 'content')

        articles = Article.objects.annotate(
            rank=SearchRank(search_vector, search_query)
        ).filter(
            rank__gt=0
        ).order_by('-rank')
    else:
        articles = Article.objects.none()

    return render(request, 'search_results.html', {
        'articles': articles,
        'query': query
    })
```

Combining multiple search queries with boolean operators:

```python
# Combine queries with boolean operators
from django.contrib.postgres.search import SearchQuery

# AND: both terms must be present
query_and = SearchQuery('python') & SearchQuery('django')

# OR: either term can be present
query_or = SearchQuery('python') | SearchQuery('ruby')

# NOT: exclude a term
query_not = SearchQuery('python') & ~SearchQuery('flask')

# Use in filter
articles = Article.objects.annotate(
    search=SearchVector('title', 'content')
).filter(
    search=query_and
)
```

---

## Reusable Search Manager

Create a custom manager to encapsulate search logic and keep your views clean.

```python
# managers.py
from django.db import models
from django.contrib.postgres.search import (
    SearchVector, SearchQuery, SearchRank, SearchHeadline, TrigramSimilarity
)

class ArticleSearchManager(models.Manager):
    def search(self, query, weights=None, config='english'):
        """
        Perform full-text search with ranking.

        Args:
            query: Search terms
            weights: Dict of field weights, e.g. {'title': 'A', 'content': 'B'}
            config: Language configuration

        Returns:
            QuerySet ordered by relevance
        """
        if not query:
            return self.none()

        # Default weights if not specified
        if weights is None:
            weights = {'title': 'A', 'content': 'B', 'author': 'C'}

        # Build search vector with weights
        search_vector = None
        for field, weight in weights.items():
            vector = SearchVector(field, weight=weight, config=config)
            search_vector = vector if search_vector is None else search_vector + vector

        search_query = SearchQuery(query, config=config)

        return self.annotate(
            rank=SearchRank(search_vector, search_query)
        ).filter(
            rank__gt=0.01
        ).order_by('-rank')

    def search_with_highlights(self, query, highlight_field='content'):
        """
        Search with highlighted snippets.
        """
        if not query:
            return self.none()

        search_query = SearchQuery(query)

        return self.annotate(
            search=SearchVector('title', 'content'),
            rank=SearchRank(SearchVector('title', 'content'), search_query),
            headline=SearchHeadline(
                highlight_field,
                search_query,
                start_sel='<mark>',
                stop_sel='</mark>',
                max_words=35,
                min_words=15,
            )
        ).filter(
            search=search_query
        ).order_by('-rank')

    def fuzzy_search(self, query, threshold=0.3):
        """
        Trigram-based fuzzy search for typo tolerance.
        """
        if not query:
            return self.none()

        return self.annotate(
            similarity=TrigramSimilarity('title', query)
        ).filter(
            similarity__gt=threshold
        ).order_by('-similarity')
```

Use the manager in your model:

```python
# models.py
from django.db import models
from .managers import ArticleSearchManager

class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.CharField(max_length=100)
    published_at = models.DateTimeField(auto_now_add=True)

    # Add custom manager
    objects = ArticleSearchManager()

    def __str__(self):
        return self.title
```

Now your views become simple:

```python
# views.py
def search_articles(request):
    query = request.GET.get('q', '')
    articles = Article.objects.search(query)

    return render(request, 'search_results.html', {
        'articles': articles,
        'query': query
    })
```

---

## Best Practices Summary

1. **Use GIN indexes** - Always index your search vector field for production use
2. **Pre-compute search vectors** - Store them in a SearchVectorField for better performance
3. **Use database triggers** - More reliable than signals for keeping search vectors updated
4. **Apply weights** - Prioritize title matches over content matches
5. **Combine with trigram** - Add fuzzy search for typo tolerance
6. **Set appropriate thresholds** - Filter out low-relevance results
7. **Use websearch type** - For user-facing search with intuitive syntax
8. **Add highlights** - Help users understand why results matched
9. **Consider language config** - Use appropriate language for stemming
10. **Benchmark your queries** - Test with realistic data volumes

---

*Need to monitor your Django application's search performance? [OneUptime](https://oneuptime.com) provides full-stack observability with traces, logs, and metrics to help you identify slow queries and optimize your search implementation.*
