# How to Use Django with Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Django, Elasticsearch, Search, Python, Full-Text Search

Description: Learn how to integrate Django with Elasticsearch for full-text search using django-elasticsearch-dsl with indexing, searching, and filtering.

---

> Full-text search is a critical feature for many web applications. While Django's ORM provides basic search capabilities, Elasticsearch offers a powerful, scalable solution for complex search requirements. This guide walks you through integrating Elasticsearch with Django using django-elasticsearch-dsl.

---

## Why Elasticsearch with Django?

Django's built-in search capabilities are limited to basic `LIKE` queries and simple full-text search with PostgreSQL. Elasticsearch provides:

| Feature | Django ORM | Elasticsearch |
|---------|------------|---------------|
| Full-text search | Basic | Advanced |
| Fuzzy matching | No | Yes |
| Faceted search | Manual | Built-in |
| Auto-complete | Manual | Built-in |
| Relevance scoring | Limited | Advanced |
| Scaling | Vertical | Horizontal |

---

## Architecture Overview

```mermaid
flowchart LR
    A[Django App] --> B[Django ORM]
    B --> C[(PostgreSQL)]
    A --> D[django-elasticsearch-dsl]
    D --> E[Elasticsearch]

    subgraph "Write Path"
        B
        C
    end

    subgraph "Search Path"
        D
        E
    end

    C -.->|Sync via Signals| E
```

The architecture keeps your primary data in PostgreSQL while Elasticsearch handles search queries. Data synchronization happens automatically through Django signals.

---

## Installation and Setup

### Install Required Packages

```bash
# Install the required packages
pip install django-elasticsearch-dsl elasticsearch

# If you need async support
pip install elasticsearch[async]
```

### Install Elasticsearch

You can run Elasticsearch locally using Docker:

```bash
# Start Elasticsearch with Docker
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.0
```

### Configure Django Settings

Add the Elasticsearch configuration to your Django settings file:

```python
# settings.py
# Elasticsearch configuration for django-elasticsearch-dsl

INSTALLED_APPS = [
    # ... your other apps
    'django_elasticsearch_dsl',
]

# Connection settings for Elasticsearch
ELASTICSEARCH_DSL = {
    'default': {
        'hosts': 'localhost:9200',  # Elasticsearch host and port
        # For production with authentication:
        # 'hosts': 'https://user:password@elasticsearch.example.com:9200',
        # 'http_auth': ('user', 'password'),
        # 'verify_certs': True,
    },
}

# Optional: Configure index settings
ELASTICSEARCH_DSL_INDEX_SETTINGS = {
    'number_of_shards': 1,  # Number of primary shards
    'number_of_replicas': 0,  # Number of replica shards (0 for development)
}
```

---

## Creating Your First Document

### Define Your Django Model

Start with a simple model that you want to make searchable:

```python
# models.py
# Product model that will be indexed in Elasticsearch
from django.db import models

class Product(models.Model):
    """Product model with fields commonly used in e-commerce search"""

    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100)
    brand = models.CharField(max_length=100)
    sku = models.CharField(max_length=50, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name
```

### Create the Elasticsearch Document

The document class maps your Django model to an Elasticsearch index:

```python
# documents.py
# Elasticsearch document definition for the Product model
from django_elasticsearch_dsl import Document, fields
from django_elasticsearch_dsl.registries import registry
from .models import Product

@registry.register_document
class ProductDocument(Document):
    """
    Elasticsearch document for Product model.
    Maps model fields to Elasticsearch field types for optimal search.
    """

    # Text fields with analyzers for full-text search
    name = fields.TextField(
        attr='name',
        fields={
            'raw': fields.KeywordField(),  # For exact matching and sorting
            'suggest': fields.CompletionField(),  # For auto-complete
        }
    )

    description = fields.TextField(
        attr='description',
        fields={
            'raw': fields.KeywordField(),  # For exact matching
        }
    )

    # Keyword fields for filtering and aggregations
    category = fields.KeywordField(attr='category')
    brand = fields.KeywordField(attr='brand')
    sku = fields.KeywordField(attr='sku')

    # Numeric fields
    price = fields.FloatField(attr='price')

    # Boolean field for filtering active products
    is_active = fields.BooleanField(attr='is_active')

    # Date fields
    created_at = fields.DateField(attr='created_at')

    class Index:
        # Name of the Elasticsearch index
        name = 'products'

        # Index settings for analysis and performance
        settings = {
            'number_of_shards': 1,
            'number_of_replicas': 0,
            'analysis': {
                'analyzer': {
                    'default': {
                        'type': 'standard',
                        'stopwords': '_english_',
                    }
                }
            }
        }

    class Django:
        model = Product  # The Django model associated with this Document

        # Fields to index from the model (besides those defined above)
        fields = []

        # Only index active products
        queryset_pagination = 1000  # Batch size for indexing
```

---

## Data Flow and Synchronization

```mermaid
sequenceDiagram
    participant User
    participant Django View
    participant Django ORM
    participant PostgreSQL
    participant Signal Handler
    participant Elasticsearch

    User->>Django View: Create/Update Product
    Django View->>Django ORM: save()
    Django ORM->>PostgreSQL: INSERT/UPDATE
    PostgreSQL-->>Django ORM: Success
    Django ORM->>Signal Handler: post_save signal
    Signal Handler->>Elasticsearch: Index document
    Elasticsearch-->>Signal Handler: Indexed
    Django View-->>User: Success response
```

---

## Indexing Data

### Create the Index

Run the following management command to create the Elasticsearch index:

```bash
# Create all registered indices
python manage.py search_index --create

# Or rebuild indices (delete and recreate)
python manage.py search_index --rebuild
```

### Populate the Index

Index all existing data:

```bash
# Populate all indices
python manage.py search_index --populate

# Populate a specific index
python manage.py search_index --populate -f
```

### Automatic Indexing with Signals

django-elasticsearch-dsl automatically syncs data using Django signals. You can customize this behavior:

```python
# documents.py
# Custom signal handling for more control over indexing

from django.db.models.signals import post_save, post_delete
from django_elasticsearch_dsl import Document
from django_elasticsearch_dsl.registries import registry

@registry.register_document
class ProductDocument(Document):
    # ... field definitions ...

    class Django:
        model = Product

        # Ignore auto-syncing and handle manually
        # Set to True to enable automatic signal-based indexing
        ignore_signals = False

        # Don't perform an index refresh after every update
        # Set to True for better write performance
        auto_refresh = False

        # Related models to watch for changes
        related_models = []

    def get_queryset(self):
        """
        Override to customize which objects get indexed.
        Only index active products for this example.
        """
        return super().get_queryset().filter(is_active=True)
```

---

## Implementing Search

### Basic Search

```python
# search.py
# Basic search functionality using django-elasticsearch-dsl
from elasticsearch_dsl import Q
from .documents import ProductDocument

def search_products(query_string):
    """
    Perform a simple multi-match search across name and description.

    Args:
        query_string: The search terms from the user

    Returns:
        Search results as a queryset-like object
    """
    # Create a search object from the document
    search = ProductDocument.search()

    # Build a multi-match query that searches across multiple fields
    query = Q(
        'multi_match',
        query=query_string,
        fields=['name^3', 'description', 'brand^2'],  # Boost name and brand
        fuzziness='AUTO',  # Allow typos
        type='best_fields',  # Return best matching field score
    )

    # Apply the query and return results
    search = search.query(query)

    # Execute and return the response
    response = search.execute()

    return response
```

### Advanced Search with Filters

```python
# search.py
# Advanced search with filtering, sorting, and pagination
from elasticsearch_dsl import Q, Search
from .documents import ProductDocument

class ProductSearchService:
    """Service class for handling product searches with various options"""

    def __init__(self):
        self.document = ProductDocument

    def search(
        self,
        query=None,
        category=None,
        brand=None,
        min_price=None,
        max_price=None,
        sort_by='relevance',
        page=1,
        page_size=20
    ):
        """
        Perform an advanced search with filters and pagination.

        Args:
            query: Search terms for full-text search
            category: Filter by category (exact match)
            brand: Filter by brand (exact match)
            min_price: Minimum price filter
            max_price: Maximum price filter
            sort_by: Sort option (relevance, price_asc, price_desc, newest)
            page: Page number for pagination
            page_size: Number of results per page

        Returns:
            Dict with results, total count, and pagination info
        """
        # Start with a base search
        search = self.document.search()

        # Only search active products
        search = search.filter('term', is_active=True)

        # Apply full-text search if query provided
        if query:
            search = search.query(
                Q('multi_match',
                    query=query,
                    fields=['name^3', 'description', 'brand^2'],
                    fuzziness='AUTO',
                    operator='and',  # All terms must match
                )
            )

        # Apply category filter
        if category:
            search = search.filter('term', category=category)

        # Apply brand filter
        if brand:
            search = search.filter('term', brand=brand)

        # Apply price range filter
        if min_price is not None or max_price is not None:
            price_filter = {}
            if min_price is not None:
                price_filter['gte'] = min_price
            if max_price is not None:
                price_filter['lte'] = max_price
            search = search.filter('range', price=price_filter)

        # Apply sorting
        search = self._apply_sorting(search, sort_by)

        # Calculate pagination offsets
        start = (page - 1) * page_size
        end = start + page_size

        # Apply pagination
        search = search[start:end]

        # Execute the search
        response = search.execute()

        # Return structured results
        return {
            'results': [hit.to_dict() for hit in response],
            'total': response.hits.total.value,
            'page': page,
            'page_size': page_size,
            'total_pages': (response.hits.total.value + page_size - 1) // page_size,
        }

    def _apply_sorting(self, search, sort_by):
        """Apply sorting based on the sort_by parameter"""
        sort_options = {
            'relevance': '_score',  # Default Elasticsearch relevance score
            'price_asc': 'price',
            'price_desc': '-price',
            'newest': '-created_at',
        }

        sort_field = sort_options.get(sort_by, '_score')
        return search.sort(sort_field)
```

---

## Search Flow with Filtering

```mermaid
flowchart TD
    A[User Search Request] --> B{Has Search Query?}
    B -->|Yes| C[Build Multi-Match Query]
    B -->|No| D[Match All Query]

    C --> E[Apply Filters]
    D --> E

    E --> F{Category Filter?}
    F -->|Yes| G[Add Term Filter]
    F -->|No| H{Price Filter?}
    G --> H

    H -->|Yes| I[Add Range Filter]
    H -->|No| J[Apply Sorting]
    I --> J

    J --> K[Apply Pagination]
    K --> L[Execute Query]
    L --> M[Return Results]
```

---

## Faceted Search and Aggregations

Faceted search allows users to narrow down results by categories, price ranges, and other attributes.

```python
# search.py
# Faceted search with aggregations for filters
from elasticsearch_dsl import A  # Aggregation builder

class FacetedSearchService(ProductSearchService):
    """Extended search service with faceting support"""

    def search_with_facets(self, **kwargs):
        """
        Perform search and return results with facet counts.

        Facets show available filter options with counts,
        allowing users to refine their search.
        """
        # Build the base search
        search = self.document.search()

        # Apply filters and query (same as parent class)
        search = self._apply_filters_and_query(search, **kwargs)

        # Add aggregations for facets
        # Category facet: shows all categories with document counts
        search.aggs.bucket(
            'categories',
            A('terms', field='category', size=50)
        )

        # Brand facet: shows all brands with document counts
        search.aggs.bucket(
            'brands',
            A('terms', field='brand', size=50)
        )

        # Price range facet: groups products by price ranges
        search.aggs.bucket(
            'price_ranges',
            A('range', field='price', ranges=[
                {'to': 50, 'key': 'under_50'},
                {'from': 50, 'to': 100, 'key': '50_to_100'},
                {'from': 100, 'to': 200, 'key': '100_to_200'},
                {'from': 200, 'key': 'over_200'},
            ])
        )

        # Price statistics for displaying min/max prices
        search.aggs.metric(
            'price_stats',
            A('stats', field='price')
        )

        # Execute search
        response = search.execute()

        # Parse aggregations into a clean format
        facets = self._parse_aggregations(response.aggregations)

        # Return results with facets
        return {
            'results': [hit.to_dict() for hit in response],
            'total': response.hits.total.value,
            'facets': facets,
        }

    def _parse_aggregations(self, aggregations):
        """Convert Elasticsearch aggregations to a clean dict"""
        return {
            'categories': [
                {'name': bucket.key, 'count': bucket.doc_count}
                for bucket in aggregations.categories.buckets
            ],
            'brands': [
                {'name': bucket.key, 'count': bucket.doc_count}
                for bucket in aggregations.brands.buckets
            ],
            'price_ranges': [
                {'name': bucket.key, 'count': bucket.doc_count}
                for bucket in aggregations.price_ranges.buckets
            ],
            'price_stats': {
                'min': aggregations.price_stats.min,
                'max': aggregations.price_stats.max,
                'avg': aggregations.price_stats.avg,
            }
        }
```

---

## Auto-Complete and Suggestions

```python
# search.py
# Auto-complete functionality using completion suggester
from elasticsearch_dsl import Search

def get_autocomplete_suggestions(prefix, size=10):
    """
    Get auto-complete suggestions for product names.

    Args:
        prefix: The partial text typed by the user
        size: Maximum number of suggestions to return

    Returns:
        List of suggested product names
    """
    # Build a suggest query using the completion field
    search = ProductDocument.search()

    # Add a completion suggester
    search = search.suggest(
        'product_suggestions',  # Name of the suggestion
        prefix,  # The partial text to complete
        completion={
            'field': 'name.suggest',  # Use the completion field
            'size': size,
            'skip_duplicates': True,
            'fuzzy': {
                'fuzziness': 'AUTO',  # Allow typos in prefix
            }
        }
    )

    # Execute the search (we only want suggestions, not hits)
    response = search.execute()

    # Extract suggestions from response
    suggestions = []
    if hasattr(response, 'suggest') and response.suggest.product_suggestions:
        for suggestion in response.suggest.product_suggestions:
            for option in suggestion.options:
                suggestions.append({
                    'text': option.text,
                    'score': option._score,
                })

    return suggestions


def get_search_suggestions(query, size=5):
    """
    Get search suggestions including spell corrections.

    Uses Elasticsearch's phrase suggester to handle typos
    and provide "did you mean" functionality.
    """
    search = ProductDocument.search()

    # Phrase suggester for spell correction
    search = search.suggest(
        'did_you_mean',
        query,
        phrase={
            'field': 'name',
            'size': size,
            'gram_size': 3,
            'direct_generator': [{
                'field': 'name',
                'suggest_mode': 'popular',
            }],
            'highlight': {
                'pre_tag': '<em>',
                'post_tag': '</em>',
            }
        }
    )

    response = search.execute()

    # Extract phrase suggestions
    corrections = []
    if hasattr(response, 'suggest') and response.suggest.did_you_mean:
        for suggestion in response.suggest.did_you_mean:
            for option in suggestion.options:
                corrections.append({
                    'text': option.text,
                    'highlighted': option.highlighted if hasattr(option, 'highlighted') else option.text,
                    'score': option.score,
                })

    return corrections
```

---

## Django Views Integration

### Class-Based Views

```python
# views.py
# Django views for search functionality
from django.views import View
from django.http import JsonResponse
from .search import ProductSearchService, FacetedSearchService

class ProductSearchView(View):
    """API view for product search"""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.search_service = FacetedSearchService()

    def get(self, request):
        """
        Handle GET requests for product search.

        Query parameters:
            q: Search query string
            category: Filter by category
            brand: Filter by brand
            min_price: Minimum price
            max_price: Maximum price
            sort: Sort option (relevance, price_asc, price_desc, newest)
            page: Page number
            page_size: Results per page
        """
        # Extract query parameters
        query = request.GET.get('q', '')
        category = request.GET.get('category')
        brand = request.GET.get('brand')
        min_price = request.GET.get('min_price')
        max_price = request.GET.get('max_price')
        sort_by = request.GET.get('sort', 'relevance')
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))

        # Convert price parameters to float if provided
        if min_price:
            min_price = float(min_price)
        if max_price:
            max_price = float(max_price)

        # Perform the search with facets
        results = self.search_service.search_with_facets(
            query=query,
            category=category,
            brand=brand,
            min_price=min_price,
            max_price=max_price,
            sort_by=sort_by,
            page=page,
            page_size=page_size,
        )

        return JsonResponse(results)


class AutocompleteView(View):
    """API view for auto-complete suggestions"""

    def get(self, request):
        """Return auto-complete suggestions for partial input"""
        prefix = request.GET.get('q', '')

        if len(prefix) < 2:
            # Require at least 2 characters
            return JsonResponse({'suggestions': []})

        from .search import get_autocomplete_suggestions
        suggestions = get_autocomplete_suggestions(prefix)

        return JsonResponse({'suggestions': suggestions})
```

### Django REST Framework Integration

```python
# serializers.py
# DRF serializers for search results
from rest_framework import serializers

class ProductSearchResultSerializer(serializers.Serializer):
    """Serializer for Elasticsearch search results"""

    name = serializers.CharField()
    description = serializers.CharField()
    price = serializers.FloatField()
    category = serializers.CharField()
    brand = serializers.CharField()
    sku = serializers.CharField()

    # Elasticsearch score for relevance ranking
    score = serializers.SerializerMethodField()

    def get_score(self, obj):
        """Extract the relevance score from the hit"""
        return getattr(obj.meta, 'score', None)


class FacetSerializer(serializers.Serializer):
    """Serializer for facet buckets"""

    name = serializers.CharField()
    count = serializers.IntegerField()


class SearchResponseSerializer(serializers.Serializer):
    """Serializer for complete search response"""

    results = ProductSearchResultSerializer(many=True)
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    facets = serializers.DictField(required=False)
```

```python
# views_drf.py
# Django REST Framework views for search
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .search import FacetedSearchService
from .serializers import SearchResponseSerializer

class ProductSearchAPIView(APIView):
    """DRF API view for product search with facets"""

    def get(self, request):
        """
        Search for products with optional filters.

        Query params:
            q: Search query
            category: Category filter
            brand: Brand filter
            min_price: Minimum price
            max_price: Maximum price
            sort: Sort order
            page: Page number
            page_size: Page size
        """
        # Parse query parameters
        params = {
            'query': request.query_params.get('q'),
            'category': request.query_params.get('category'),
            'brand': request.query_params.get('brand'),
            'min_price': self._parse_float(request.query_params.get('min_price')),
            'max_price': self._parse_float(request.query_params.get('max_price')),
            'sort_by': request.query_params.get('sort', 'relevance'),
            'page': int(request.query_params.get('page', 1)),
            'page_size': min(int(request.query_params.get('page_size', 20)), 100),
        }

        # Execute search
        search_service = FacetedSearchService()
        results = search_service.search_with_facets(**params)

        # Serialize and return response
        serializer = SearchResponseSerializer(results)
        return Response(serializer.data)

    def _parse_float(self, value):
        """Safely parse a float value from query params"""
        if value is None:
            return None
        try:
            return float(value)
        except ValueError:
            return None
```

---

## URL Configuration

```python
# urls.py
# URL patterns for search endpoints
from django.urls import path
from .views import ProductSearchView, AutocompleteView
from .views_drf import ProductSearchAPIView

urlpatterns = [
    # Standard Django views
    path('search/', ProductSearchView.as_view(), name='product-search'),
    path('autocomplete/', AutocompleteView.as_view(), name='autocomplete'),

    # DRF API endpoints
    path('api/search/', ProductSearchAPIView.as_view(), name='api-product-search'),
]
```

---

## Handling Related Models

When your searchable model has related models, you need to handle indexing carefully:

```python
# models.py
# Models with relationships
from django.db import models

class Category(models.Model):
    """Category model"""
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name


class Tag(models.Model):
    """Tag model for product tagging"""
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name


class Product(models.Model):
    """Product with category and tags"""
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    tags = models.ManyToManyField(Tag, blank=True)
    is_active = models.BooleanField(default=True)
```

```python
# documents.py
# Document with nested objects and related models
from django_elasticsearch_dsl import Document, fields
from django_elasticsearch_dsl.registries import registry
from .models import Product, Category, Tag

@registry.register_document
class ProductDocument(Document):
    """Document with related model support"""

    # Main text fields
    name = fields.TextField(
        fields={'raw': fields.KeywordField()}
    )
    description = fields.TextField()

    # Related model: Category (ForeignKey)
    # Use ObjectField for nested representation
    category = fields.ObjectField(
        properties={
            'id': fields.IntegerField(),
            'name': fields.TextField(
                fields={'raw': fields.KeywordField()}
            ),
            'slug': fields.KeywordField(),
        }
    )

    # Related model: Tags (ManyToMany)
    # Use NestedField for array of objects
    tags = fields.NestedField(
        properties={
            'id': fields.IntegerField(),
            'name': fields.TextField(
                fields={'raw': fields.KeywordField()}
            ),
        }
    )

    price = fields.FloatField()
    is_active = fields.BooleanField()

    class Index:
        name = 'products_with_relations'
        settings = {
            'number_of_shards': 1,
            'number_of_replicas': 0,
        }

    class Django:
        model = Product

        # Watch these related models for changes
        # When a Category is updated, re-index all related Products
        related_models = [Category, Tag]

    def get_instances_from_related(self, related_instance):
        """
        Return Product instances when a related model changes.
        This ensures the index stays in sync with related changes.
        """
        if isinstance(related_instance, Category):
            # Return all products in this category
            return related_instance.product_set.all()
        elif isinstance(related_instance, Tag):
            # Return all products with this tag
            return related_instance.product_set.all()
        return []
```

---

## Performance Optimization

### Bulk Indexing

For large datasets, use bulk indexing:

```python
# bulk_index.py
# Efficient bulk indexing for large datasets
from django.core.management.base import BaseCommand
from elasticsearch.helpers import bulk
from elasticsearch_dsl import connections
from products.documents import ProductDocument
from products.models import Product

def bulk_index_products(batch_size=1000):
    """
    Bulk index all products for better performance.

    Much faster than indexing one document at a time,
    especially for initial data loads or rebuilds.
    """
    # Get Elasticsearch connection
    es = connections.get_connection()

    # Generator function for bulk indexing
    def generate_actions():
        # Iterate over products in batches
        queryset = Product.objects.filter(is_active=True)

        for product in queryset.iterator(chunk_size=batch_size):
            # Convert model instance to Elasticsearch document
            doc = ProductDocument()
            doc_dict = doc.prepare(product)

            # Yield the action for bulk indexing
            yield {
                '_index': ProductDocument.Index.name,
                '_id': product.pk,
                '_source': doc_dict,
            }

    # Perform bulk indexing
    success, failed = bulk(
        es,
        generate_actions(),
        chunk_size=batch_size,
        request_timeout=300,  # 5 minute timeout for large batches
    )

    print(f"Successfully indexed: {success}")
    print(f"Failed: {failed}")

    return success, failed
```

### Query Optimization

```python
# search.py
# Optimized search queries
from elasticsearch_dsl import Search

def optimized_search(query, page=1, page_size=20):
    """
    Optimized search with source filtering and highlighting.
    """
    search = ProductDocument.search()

    # Only return the fields we need (reduces network transfer)
    search = search.source(
        includes=['name', 'price', 'category', 'brand', 'sku'],
        excludes=['description']  # Exclude large fields if not needed
    )

    # Add query
    if query:
        search = search.query(
            'multi_match',
            query=query,
            fields=['name^3', 'description', 'brand^2'],
            fuzziness='AUTO',
        )

    # Add highlighting for matched terms
    search = search.highlight(
        'name',
        'description',
        pre_tags=['<mark>'],
        post_tags=['</mark>'],
        fragment_size=150,
        number_of_fragments=3,
    )

    # Apply pagination
    start = (page - 1) * page_size
    search = search[start:start + page_size]

    # Execute and process results
    response = search.execute()

    results = []
    for hit in response:
        result = hit.to_dict()

        # Add highlights if available
        if hasattr(hit.meta, 'highlight'):
            result['highlights'] = dict(hit.meta.highlight)

        results.append(result)

    return {
        'results': results,
        'total': response.hits.total.value,
    }
```

---

## Testing Elasticsearch Integration

```python
# tests.py
# Test cases for Elasticsearch integration
from django.test import TestCase, override_settings
from unittest.mock import patch, MagicMock
from products.models import Product
from products.documents import ProductDocument
from products.search import ProductSearchService

# Use a separate index for testing
TEST_ELASTICSEARCH_DSL = {
    'default': {
        'hosts': 'localhost:9200',
    },
}

@override_settings(ELASTICSEARCH_DSL=TEST_ELASTICSEARCH_DSL)
class ProductSearchTest(TestCase):
    """Test cases for product search functionality"""

    @classmethod
    def setUpClass(cls):
        """Set up test index before running tests"""
        super().setUpClass()
        # Create a test index
        ProductDocument._index.delete(ignore=404)
        ProductDocument.init()

    @classmethod
    def tearDownClass(cls):
        """Clean up test index after tests"""
        ProductDocument._index.delete(ignore=404)
        super().tearDownClass()

    def setUp(self):
        """Create test data"""
        self.product = Product.objects.create(
            name='Test Product',
            description='A great test product for testing',
            price=99.99,
            category='Electronics',
            brand='TestBrand',
            sku='TEST-001',
            is_active=True,
        )

        # Manually index the product for testing
        ProductDocument().update(self.product)

        # Refresh index to make document searchable immediately
        ProductDocument._index.refresh()

    def test_basic_search(self):
        """Test basic search functionality"""
        service = ProductSearchService()
        results = service.search(query='test product')

        self.assertEqual(results['total'], 1)
        self.assertEqual(results['results'][0]['name'], 'Test Product')

    def test_category_filter(self):
        """Test filtering by category"""
        service = ProductSearchService()

        # Should find the product
        results = service.search(category='Electronics')
        self.assertEqual(results['total'], 1)

        # Should not find the product
        results = service.search(category='Clothing')
        self.assertEqual(results['total'], 0)

    def test_price_range_filter(self):
        """Test filtering by price range"""
        service = ProductSearchService()

        # Product is priced at 99.99
        results = service.search(min_price=50, max_price=100)
        self.assertEqual(results['total'], 1)

        results = service.search(min_price=100, max_price=200)
        self.assertEqual(results['total'], 0)

    def test_fuzzy_search(self):
        """Test fuzzy matching handles typos"""
        service = ProductSearchService()

        # Search with a typo
        results = service.search(query='testt product')

        # Should still find the product due to fuzzy matching
        self.assertEqual(results['total'], 1)


class MockElasticsearchTest(TestCase):
    """Test search with mocked Elasticsearch for unit testing"""

    @patch('products.documents.ProductDocument.search')
    def test_search_with_mock(self, mock_search):
        """Test search logic without real Elasticsearch"""
        # Create mock response
        mock_hit = MagicMock()
        mock_hit.to_dict.return_value = {
            'name': 'Mock Product',
            'price': 49.99,
        }
        mock_hit.meta.score = 1.5

        mock_response = MagicMock()
        mock_response.hits.total.value = 1
        mock_response.__iter__ = lambda self: iter([mock_hit])

        mock_search.return_value.query.return_value.execute.return_value = mock_response

        service = ProductSearchService()
        results = service.search(query='mock')

        self.assertEqual(results['total'], 1)
```

---

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| Use keyword fields for filtering | Text fields are analyzed; use keyword subfields for exact matches |
| Boost important fields | Use `^` notation to increase relevance of key fields |
| Limit result size | Always paginate results; never request all documents |
| Use source filtering | Only request fields you need to reduce network overhead |
| Index async for writes | Consider Celery for background indexing to avoid slow writes |
| Monitor index health | Track index size, query latency, and indexing rate |
| Test with mocks | Use mocked Elasticsearch for unit tests, real ES for integration tests |

---

## Common Issues and Solutions

### Index Not Updating

```python
# Force refresh after updates
from elasticsearch_dsl import connections

def force_refresh_index():
    """Force Elasticsearch to make recent changes searchable"""
    es = connections.get_connection()
    es.indices.refresh(index='products')
```

### Handling Connection Errors

```python
# search.py
# Resilient search with error handling
from elasticsearch.exceptions import ConnectionError, RequestError

def resilient_search(query):
    """Search with proper error handling"""
    try:
        service = ProductSearchService()
        return service.search(query=query)
    except ConnectionError:
        # Elasticsearch is unavailable
        # Fall back to database search or return empty results
        return {
            'results': [],
            'total': 0,
            'error': 'Search service temporarily unavailable',
        }
    except RequestError as e:
        # Invalid query syntax
        return {
            'results': [],
            'total': 0,
            'error': f'Invalid search query: {str(e)}',
        }
```

---

## Conclusion

Integrating Django with Elasticsearch provides a powerful search solution for your applications. Key takeaways:

- Use `django-elasticsearch-dsl` to simplify the integration
- Keep your primary data in PostgreSQL and sync to Elasticsearch
- Use proper field types for different use cases (text vs keyword)
- Implement faceted search for better user experience
- Optimize queries with source filtering and pagination
- Handle connection errors gracefully

With this setup, you can build fast, scalable search features that handle complex queries, fuzzy matching, and faceted navigation.

---

*Need to monitor your Django and Elasticsearch infrastructure? [OneUptime](https://oneuptime.com) provides comprehensive monitoring with support for both Django applications and Elasticsearch clusters.*

**Related Reading:**
- [How to Build Health Checks in Python for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
- [Structured Logging with Python and OpenTelemetry](https://oneuptime.com/blog/post/2025-01-06-python-structured-logging-opentelemetry/view)
