# How to Build Full-Text Search with Elasticsearch in Spring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Elasticsearch, Search, Full-Text Search, Spring Data

Description: Learn how to implement full-text search in Spring Boot applications using Elasticsearch. This guide covers indexing, querying, fuzzy matching, highlighting, autocomplete, and pagination for building powerful search features.

---

Full-text search is a fundamental feature for many applications. Whether you are building an e-commerce product search, a document management system, or a log analysis tool, Elasticsearch provides the speed and relevance scoring that traditional database queries cannot match.

This guide walks you through integrating Elasticsearch with Spring Boot using Spring Data Elasticsearch, covering everything from basic indexing to advanced search features like fuzzy matching and autocomplete.

---

## Setting Up Elasticsearch with Spring Boot

Add the required dependencies:

```xml
<!-- pom.xml -->
<dependencies>
    <!-- Spring Data Elasticsearch -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-elasticsearch</artifactId>
    </dependency>

    <!-- JSON processing for custom queries -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
</dependencies>
```

Configure the Elasticsearch connection:

```yaml
# application.yml
spring:
  elasticsearch:
    uris: http://localhost:9200
    username: ${ELASTICSEARCH_USERNAME:}
    password: ${ELASTICSEARCH_PASSWORD:}
    connection-timeout: 5s
    socket-timeout: 30s
```

For production with SSL:

```yaml
# application.yml - production configuration
spring:
  elasticsearch:
    uris: https://elasticsearch.example.com:9200
    username: ${ELASTICSEARCH_USERNAME}
    password: ${ELASTICSEARCH_PASSWORD}
    ssl:
      bundle: elasticsearch
```

---

## Defining the Document Model

Create a document class that maps to an Elasticsearch index:

```java
// Product.java
// Document model for product search
package com.example.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.elasticsearch.annotations.Setting;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Document(indexName = "products")
@Setting(settingPath = "elasticsearch/product-settings.json")
public class Product {

    @Id
    private String id;

    // Text field for full-text search with custom analyzer
    @Field(type = FieldType.Text, analyzer = "standard")
    private String name;

    // Text field with multiple analyzers for different search scenarios
    @MultiField(
        mainField = @Field(type = FieldType.Text, analyzer = "standard"),
        otherFields = {
            @InnerField(suffix = "keyword", type = FieldType.Keyword),
            @InnerField(suffix = "autocomplete", type = FieldType.Text, analyzer = "autocomplete")
        }
    )
    private String description;

    // Keyword field for exact matching and aggregations
    @Field(type = FieldType.Keyword)
    private String category;

    // Keyword field for filtering
    @Field(type = FieldType.Keyword)
    private String brand;

    // Nested field for searchable tags
    @Field(type = FieldType.Keyword)
    private List<String> tags;

    // Numeric field for range queries and sorting
    @Field(type = FieldType.Double)
    private BigDecimal price;

    // Boolean field for filtering
    @Field(type = FieldType.Boolean)
    private boolean inStock;

    // Integer for sorting by popularity
    @Field(type = FieldType.Integer)
    private int rating;

    // Date field for sorting and range queries
    @Field(type = FieldType.Date)
    private Instant createdAt;

    @Field(type = FieldType.Date)
    private Instant updatedAt;

    // Constructors, getters, setters
    public Product() {}

    public Product(String name, String description, String category,
                   BigDecimal price, boolean inStock) {
        this.name = name;
        this.description = description;
        this.category = category;
        this.price = price;
        this.inStock = inStock;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    // Getters and setters omitted for brevity
}
```

Create custom index settings for better search quality:

```json
// src/main/resources/elasticsearch/product-settings.json
{
  "analysis": {
    "analyzer": {
      "autocomplete": {
        "type": "custom",
        "tokenizer": "standard",
        "filter": ["lowercase", "autocomplete_filter"]
      },
      "autocomplete_search": {
        "type": "custom",
        "tokenizer": "standard",
        "filter": ["lowercase"]
      }
    },
    "filter": {
      "autocomplete_filter": {
        "type": "edge_ngram",
        "min_gram": 2,
        "max_gram": 20
      }
    }
  }
}
```

---

## Repository Layer

Create a repository interface for basic operations:

```java
// ProductRepository.java
// Spring Data Elasticsearch repository
package com.example.repository;

import com.example.document.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.annotations.Query;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.math.BigDecimal;
import java.util.List;

public interface ProductRepository extends ElasticsearchRepository<Product, String> {

    // Derived query methods - Spring generates the query
    List<Product> findByCategory(String category);

    List<Product> findByBrand(String brand);

    Page<Product> findByInStockTrue(Pageable pageable);

    // Price range query
    List<Product> findByPriceBetween(BigDecimal min, BigDecimal max);

    // Full-text search on name
    Page<Product> findByNameContaining(String keyword, Pageable pageable);

    // Custom query using Query annotation
    @Query("{\"bool\": {\"must\": [{\"match\": {\"name\": \"?0\"}}], \"filter\": [{\"term\": {\"inStock\": true}}]}}")
    Page<Product> searchByNameInStock(String name, Pageable pageable);

    // Search across multiple fields
    @Query("{\"multi_match\": {\"query\": \"?0\", \"fields\": [\"name^3\", \"description\", \"tags\"], \"type\": \"best_fields\"}}")
    Page<Product> searchAcrossFields(String query, Pageable pageable);
}
```

---

## Advanced Search Service

Build a service for complex search scenarios:

```java
// ProductSearchService.java
// Service for advanced Elasticsearch queries
package com.example.service;

import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.QueryBuilders;
import com.example.document.Product;
import com.example.dto.ProductSearchRequest;
import com.example.dto.ProductSearchResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.HighlightQuery;
import org.springframework.data.elasticsearch.core.query.highlight.Highlight;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightField;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductSearchService {

    private final ElasticsearchOperations elasticsearchOperations;

    public ProductSearchService(ElasticsearchOperations elasticsearchOperations) {
        this.elasticsearchOperations = elasticsearchOperations;
    }

    // Full-text search with filters and pagination
    public ProductSearchResponse search(ProductSearchRequest request) {
        // Build the query
        NativeQuery query = buildSearchQuery(request);

        // Execute search
        SearchHits<Product> searchHits = elasticsearchOperations.search(query, Product.class);

        // Map results
        List<ProductSearchResponse.ProductHit> hits = searchHits.getSearchHits().stream()
            .map(this::mapSearchHit)
            .collect(Collectors.toList());

        return ProductSearchResponse.builder()
            .hits(hits)
            .totalHits(searchHits.getTotalHits())
            .page(request.getPage())
            .size(request.getSize())
            .build();
    }

    private NativeQuery buildSearchQuery(ProductSearchRequest request) {
        // Build bool query with must, should, and filter clauses
        BoolQuery.Builder boolQuery = new BoolQuery.Builder();

        // Full-text search across multiple fields
        if (request.getQuery() != null && !request.getQuery().isEmpty()) {
            boolQuery.must(Query.of(q -> q
                .multiMatch(mm -> mm
                    .query(request.getQuery())
                    .fields("name^3", "description^2", "tags")  // Boost name matches
                    .type(co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType.BestFields)
                    .fuzziness("AUTO")  // Enable fuzzy matching for typos
                )
            ));
        }

        // Category filter (exact match)
        if (request.getCategory() != null) {
            boolQuery.filter(Query.of(q -> q
                .term(t -> t.field("category").value(request.getCategory()))
            ));
        }

        // Brand filter
        if (request.getBrand() != null) {
            boolQuery.filter(Query.of(q -> q
                .term(t -> t.field("brand").value(request.getBrand()))
            ));
        }

        // Price range filter
        if (request.getMinPrice() != null || request.getMaxPrice() != null) {
            boolQuery.filter(Query.of(q -> q
                .range(r -> {
                    r.field("price");
                    if (request.getMinPrice() != null) {
                        r.gte(co.elastic.clients.json.JsonData.of(request.getMinPrice()));
                    }
                    if (request.getMaxPrice() != null) {
                        r.lte(co.elastic.clients.json.JsonData.of(request.getMaxPrice()));
                    }
                    return r;
                })
            ));
        }

        // In-stock filter
        if (request.isInStockOnly()) {
            boolQuery.filter(Query.of(q -> q
                .term(t -> t.field("inStock").value(true))
            ));
        }

        // Build the native query with pagination, sorting, and highlighting
        NativeQuery.Builder queryBuilder = NativeQuery.builder()
            .withQuery(Query.of(q -> q.bool(boolQuery.build())))
            .withPageable(PageRequest.of(request.getPage(), request.getSize()));

        // Add sorting
        if ("price_asc".equals(request.getSortBy())) {
            queryBuilder.withSort(s -> s.field(f -> f.field("price").order(SortOrder.Asc)));
        } else if ("price_desc".equals(request.getSortBy())) {
            queryBuilder.withSort(s -> s.field(f -> f.field("price").order(SortOrder.Desc)));
        } else if ("rating".equals(request.getSortBy())) {
            queryBuilder.withSort(s -> s.field(f -> f.field("rating").order(SortOrder.Desc)));
        } else {
            // Default: sort by relevance score
            queryBuilder.withSort(s -> s.score(sc -> sc.order(SortOrder.Desc)));
        }

        // Add highlighting for search results
        queryBuilder.withHighlightQuery(new HighlightQuery(
            new Highlight(List.of(
                new HighlightField("name"),
                new HighlightField("description")
            )),
            Product.class
        ));

        return queryBuilder.build();
    }

    private ProductSearchResponse.ProductHit mapSearchHit(SearchHit<Product> hit) {
        Product product = hit.getContent();

        // Extract highlighted fragments
        List<String> nameHighlights = hit.getHighlightFields().get("name");
        List<String> descriptionHighlights = hit.getHighlightFields().get("description");

        return ProductSearchResponse.ProductHit.builder()
            .product(product)
            .score(hit.getScore())
            .highlightedName(nameHighlights != null ? nameHighlights.get(0) : product.getName())
            .highlightedDescription(descriptionHighlights != null ?
                String.join("...", descriptionHighlights) : product.getDescription())
            .build();
    }
}
```

---

## Autocomplete Search

Implement search-as-you-type functionality:

```java
// AutocompleteService.java
// Service for autocomplete/typeahead suggestions
package com.example.service;

import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import com.example.document.Product;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AutocompleteService {

    private final ElasticsearchOperations elasticsearchOperations;

    public AutocompleteService(ElasticsearchOperations elasticsearchOperations) {
        this.elasticsearchOperations = elasticsearchOperations;
    }

    // Return product name suggestions as user types
    public List<String> getSuggestions(String prefix, int limit) {
        // Use edge ngram analyzer for prefix matching
        NativeQuery query = NativeQuery.builder()
            .withQuery(Query.of(q -> q
                .match(m -> m
                    .field("name.autocomplete")
                    .query(prefix)
                )
            ))
            .withMaxResults(limit)
            .build();

        SearchHits<Product> hits = elasticsearchOperations.search(query, Product.class);

        return hits.getSearchHits().stream()
            .map(hit -> hit.getContent().getName())
            .distinct()
            .limit(limit)
            .collect(Collectors.toList());
    }

    // Return full product suggestions with metadata
    public List<ProductSuggestion> getProductSuggestions(String prefix, int limit) {
        NativeQuery query = NativeQuery.builder()
            .withQuery(Query.of(q -> q
                .bool(b -> b
                    .should(Query.of(sq -> sq
                        .match(m -> m
                            .field("name.autocomplete")
                            .query(prefix)
                            .boost(2.0f)  // Boost name matches
                        )
                    ))
                    .should(Query.of(sq -> sq
                        .match(m -> m
                            .field("brand")
                            .query(prefix)
                        )
                    ))
                )
            ))
            .withMaxResults(limit)
            .build();

        SearchHits<Product> hits = elasticsearchOperations.search(query, Product.class);

        return hits.getSearchHits().stream()
            .map(hit -> {
                Product product = hit.getContent();
                return ProductSuggestion.builder()
                    .id(product.getId())
                    .name(product.getName())
                    .category(product.getCategory())
                    .price(product.getPrice())
                    .build();
            })
            .collect(Collectors.toList());
    }
}
```

---

## Fuzzy Search for Typo Tolerance

Handle misspellings gracefully:

```java
// FuzzySearchService.java
// Search with typo tolerance using fuzzy matching
package com.example.service;

import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import com.example.document.Product;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FuzzySearchService {

    private final ElasticsearchOperations elasticsearchOperations;

    public FuzzySearchService(ElasticsearchOperations elasticsearchOperations) {
        this.elasticsearchOperations = elasticsearchOperations;
    }

    // Search with fuzzy matching - handles typos like "iphoen" -> "iphone"
    public List<Product> fuzzySearch(String query, int page, int size) {
        NativeQuery nativeQuery = NativeQuery.builder()
            .withQuery(Query.of(q -> q
                .bool(b -> b
                    // Try exact match first with high boost
                    .should(Query.of(sq -> sq
                        .match(m -> m
                            .field("name")
                            .query(query)
                            .boost(3.0f)
                        )
                    ))
                    // Then fuzzy match with lower boost
                    .should(Query.of(sq -> sq
                        .fuzzy(f -> f
                            .field("name")
                            .value(query)
                            .fuzziness("AUTO")      // Auto-adjust edit distance based on term length
                            .prefixLength(2)         // First 2 chars must match exactly
                            .maxExpansions(50)       // Max terms to match
                        )
                    ))
                    // Also search description with fuzziness
                    .should(Query.of(sq -> sq
                        .match(m -> m
                            .field("description")
                            .query(query)
                            .fuzziness("AUTO")
                        )
                    ))
                )
            ))
            .withPageable(PageRequest.of(page, size))
            .build();

        SearchHits<Product> hits = elasticsearchOperations.search(nativeQuery, Product.class);

        return hits.getSearchHits().stream()
            .map(hit -> hit.getContent())
            .collect(Collectors.toList());
    }
}
```

---

## Search Request and Response DTOs

Define clean API contracts:

```java
// ProductSearchRequest.java
// Search request parameters
package com.example.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class ProductSearchRequest {

    private String query;           // Full-text search query
    private String category;        // Filter by category
    private String brand;           // Filter by brand
    private BigDecimal minPrice;    // Minimum price filter
    private BigDecimal maxPrice;    // Maximum price filter
    private boolean inStockOnly;    // Only show in-stock items
    private String sortBy;          // Sort option: relevance, price_asc, price_desc, rating

    @Builder.Default
    private int page = 0;

    @Builder.Default
    private int size = 20;
}
```

```java
// ProductSearchResponse.java
// Search response with hits and metadata
package com.example.dto;

import com.example.document.Product;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ProductSearchResponse {

    private List<ProductHit> hits;
    private long totalHits;
    private int page;
    private int size;

    @Getter
    @Builder
    public static class ProductHit {
        private Product product;
        private float score;
        private String highlightedName;
        private String highlightedDescription;
    }
}
```

---

## REST Controller

Expose search endpoints:

```java
// ProductSearchController.java
// REST endpoints for product search
package com.example.controller;

import com.example.dto.ProductSearchRequest;
import com.example.dto.ProductSearchResponse;
import com.example.dto.ProductSuggestion;
import com.example.service.AutocompleteService;
import com.example.service.ProductSearchService;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductSearchController {

    private final ProductSearchService searchService;
    private final AutocompleteService autocompleteService;

    public ProductSearchController(
            ProductSearchService searchService,
            AutocompleteService autocompleteService) {
        this.searchService = searchService;
        this.autocompleteService = autocompleteService;
    }

    // Full product search with filters
    @GetMapping("/search")
    public ProductSearchResponse search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "false") boolean inStock,
            @RequestParam(defaultValue = "relevance") String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        ProductSearchRequest request = ProductSearchRequest.builder()
            .query(q)
            .category(category)
            .brand(brand)
            .minPrice(minPrice)
            .maxPrice(maxPrice)
            .inStockOnly(inStock)
            .sortBy(sortBy)
            .page(page)
            .size(size)
            .build();

        return searchService.search(request);
    }

    // Autocomplete endpoint for search box
    @GetMapping("/autocomplete")
    public List<ProductSuggestion> autocomplete(
            @RequestParam String q,
            @RequestParam(defaultValue = "5") int limit) {

        return autocompleteService.getProductSuggestions(q, limit);
    }
}
```

---

## Indexing Products

Create a service for indexing operations:

```java
// ProductIndexService.java
// Service for indexing products in Elasticsearch
package com.example.service;

import com.example.document.Product;
import com.example.repository.ProductRepository;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductIndexService {

    private final ProductRepository productRepository;
    private final ElasticsearchOperations elasticsearchOperations;

    public ProductIndexService(
            ProductRepository productRepository,
            ElasticsearchOperations elasticsearchOperations) {
        this.productRepository = productRepository;
        this.elasticsearchOperations = elasticsearchOperations;
    }

    // Index a single product
    public Product indexProduct(Product product) {
        return productRepository.save(product);
    }

    // Bulk index multiple products
    public Iterable<Product> bulkIndex(List<Product> products) {
        return productRepository.saveAll(products);
    }

    // Delete a product from the index
    public void deleteProduct(String productId) {
        productRepository.deleteById(productId);
    }

    // Recreate the index (useful for mapping changes)
    public void recreateIndex() {
        IndexOperations indexOps = elasticsearchOperations.indexOps(Product.class);

        // Delete existing index
        if (indexOps.exists()) {
            indexOps.delete();
        }

        // Create new index with mappings
        indexOps.create();
        indexOps.putMapping(indexOps.createMapping());
    }

    // Check index health
    public boolean isIndexHealthy() {
        try {
            IndexOperations indexOps = elasticsearchOperations.indexOps(Product.class);
            return indexOps.exists();
        } catch (Exception e) {
            return false;
        }
    }
}
```

---

## Best Practices

1. **Use appropriate field types** - Text for full-text search, Keyword for exact matching and aggregations

2. **Boost important fields** - Give higher weight to product names than descriptions

3. **Enable fuzzy matching** - Users make typos; handle them gracefully

4. **Normalize URIs in autocomplete** - Limit autocomplete results to prevent UI clutter

5. **Add highlighting** - Show users why results matched their query

6. **Use filters for exact matches** - Filters are faster than queries and cached

7. **Paginate results** - Never return unbounded result sets

---

## Conclusion

Elasticsearch combined with Spring Data Elasticsearch provides a powerful foundation for building search features. Start with basic full-text search, then add fuzzy matching, autocomplete, and filtering as your requirements evolve. The key is choosing the right field types and query structures for your specific use case.

---

*Search quality directly impacts user experience. [OneUptime](https://oneuptime.com) helps you monitor search latency and error rates so you can ensure your search features perform well in production.*

**Related Reading:**
- [How to Build a Global Exception Handler in Spring Boot](https://oneuptime.com/blog/post/2026-01-27-global-exception-handler-spring-boot/view)
- [How to Implement Multi-Level Caching in Spring Boot](https://oneuptime.com/blog/post/2026-01-29-multi-level-caching-spring-boot/view)
