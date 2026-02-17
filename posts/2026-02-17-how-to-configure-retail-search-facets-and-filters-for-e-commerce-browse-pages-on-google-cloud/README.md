# How to Configure Retail Search Facets and Filters for E-Commerce Browse Pages on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Retail Search, Facets, Filters, E-Commerce, Google Cloud

Description: Configure retail search facets and filters using Vertex AI Search for Commerce to build effective browse and category pages for your e-commerce site.

---

Browse pages with faceted navigation are a core part of any e-commerce experience. When a customer clicks on "Men's Shoes" and sees filter options for brand, size, color, price range, and material on the left side of the page, those are facets. Getting facets right has a direct impact on conversion rates - customers who filter find what they want faster and buy more often.

Vertex AI Search for Commerce on Google Cloud handles faceted search out of the box, but the default configuration rarely matches your specific catalog structure. In this post, I will show you how to configure custom facets, dynamic filters, price range bucketing, and ordered facet values so your browse pages work the way your customers expect.

## Understanding Facets vs Filters

Before diving in, let me clarify the terminology:

- **Facets** are the groups of filter options shown in the UI (Brand, Color, Size, Price)
- **Facet values** are the individual options within each facet (Nike, Adidas, Puma under Brand)
- **Filters** are the active selections a customer has made (Brand: Nike AND Color: Red)

The Retail API returns facet data with search results, and accepts filters as part of the search request. Your frontend renders the facets and sends back filters when users click on them.

## Prerequisites

- Vertex AI Search for Commerce set up with a product catalog imported
- Products with well-structured attributes (brand, color, size, material, etc.)
- The Retail API enabled

## Step 1: Define Facet Specifications

Facets are specified in the search request. You tell the API which product attributes to facet on, how many values to return, and how to order them.

This Python function configures a comprehensive set of facets for a shoe category page:

```python
from google.cloud import retail_v2

def build_facet_specs():
    """Builds facet specifications for a product browse page."""
    facet_specs = []

    # Brand facet - show top 20 brands sorted by count
    facet_specs.append(
        retail_v2.SearchRequest.FacetSpec(
            facet_key=retail_v2.SearchRequest.FacetSpec.FacetKey(
                key="brands",
                order_by="count desc",
            ),
            limit=20,
            excluded_filter_keys=["brands"],  # Don't filter brand facet by brand selection
        )
    )

    # Color facet - show color families
    facet_specs.append(
        retail_v2.SearchRequest.FacetSpec(
            facet_key=retail_v2.SearchRequest.FacetSpec.FacetKey(
                key="colorFamilies",
                order_by="count desc",
            ),
            limit=15,
        )
    )

    # Size facet - ordered numerically rather than by count
    facet_specs.append(
        retail_v2.SearchRequest.FacetSpec(
            facet_key=retail_v2.SearchRequest.FacetSpec.FacetKey(
                key="sizes",
                order_by="value",  # Sort sizes numerically
            ),
            limit=30,
        )
    )

    # Price facet - with predefined range buckets
    facet_specs.append(
        retail_v2.SearchRequest.FacetSpec(
            facet_key=retail_v2.SearchRequest.FacetSpec.FacetKey(
                key="price",
                intervals=[
                    retail_v2.Interval(minimum=0, maximum=25),
                    retail_v2.Interval(minimum=25, maximum=50),
                    retail_v2.Interval(minimum=50, maximum=100),
                    retail_v2.Interval(minimum=100, maximum=150),
                    retail_v2.Interval(minimum=150, maximum=200),
                    retail_v2.Interval(minimum=200, maximum=500),
                ],
            ),
        )
    )

    # Custom attribute facet - material type
    facet_specs.append(
        retail_v2.SearchRequest.FacetSpec(
            facet_key=retail_v2.SearchRequest.FacetSpec.FacetKey(
                key="attributes.material",
                order_by="count desc",
            ),
            limit=10,
        )
    )

    # Rating facet - with numeric intervals
    facet_specs.append(
        retail_v2.SearchRequest.FacetSpec(
            facet_key=retail_v2.SearchRequest.FacetSpec.FacetKey(
                key="attributes.rating",
                intervals=[
                    retail_v2.Interval(minimum=4, maximum=5),
                    retail_v2.Interval(minimum=3, maximum=4),
                    retail_v2.Interval(minimum=2, maximum=3),
                    retail_v2.Interval(minimum=1, maximum=2),
                ],
            ),
        )
    )

    return facet_specs
```

## Step 2: Build the Browse Page Search Request

Combine facets with category filtering and pagination for a complete browse page experience.

This function handles the full browse page request including facets and active filters:

```python
from google.cloud import retail_v2

def browse_category(project_id, category, active_filters=None, page_size=24, page_token=None):
    """Fetches products for a category browse page with facets.

    Args:
        category: Category path like "Shoes > Running Shoes > Men's"
        active_filters: Dict of active filter selections, e.g.
            {"brands": ["Nike", "Adidas"], "colorFamilies": ["Red"]}
    """
    client = retail_v2.SearchServiceClient()

    placement = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog/placements/default_search"
    )

    # Build filter string from active filter selections
    filter_parts = [f'categories: ANY("{category}")']

    if active_filters:
        for key, values in active_filters.items():
            if key == "price":
                # Price filters use numeric range syntax
                for price_range in values:
                    filter_parts.append(
                        f'price: IN({price_range["min"]}e+0, {price_range["max"]}e+0)'
                    )
            else:
                # Text attribute filters
                quoted_values = ", ".join(f'"{v}"' for v in values)
                filter_parts.append(f'{key}: ANY({quoted_values})')

    filter_string = " AND ".join(filter_parts)

    # Build the search request with facets
    request = retail_v2.SearchRequest(
        placement=placement,
        query="*",  # Wildcard query for browse pages
        filter=filter_string,
        page_size=page_size,
        page_token=page_token or "",
        facet_specs=build_facet_specs(),
        order_by="relevance desc",
    )

    response = client.search(request=request)

    # Parse facet results for the UI
    facets = {}
    for facet_result in response.facets:
        facet_key = facet_result.key
        facets[facet_key] = {
            "key": facet_key,
            "values": []
        }
        for value in facet_result.values:
            if value.interval:
                # Numeric interval facet (price, rating)
                facets[facet_key]["values"].append({
                    "min": value.interval.minimum,
                    "max": value.interval.maximum,
                    "count": value.count,
                })
            else:
                # Text value facet (brand, color, size)
                facets[facet_key]["values"].append({
                    "value": value.value,
                    "count": value.count,
                })

    # Parse product results
    products = []
    for result in response.results:
        p = result.product
        products.append({
            "id": p.id,
            "title": p.title,
            "price": p.price_info.price if p.price_info else None,
            "original_price": p.price_info.original_price if p.price_info else None,
            "image": p.images[0].uri if p.images else None,
            "brand": p.brands[0] if p.brands else None,
            "colors": list(p.color_info.color_families) if p.color_info else [],
        })

    return {
        "products": products,
        "facets": facets,
        "total": response.total_size,
        "next_page_token": response.next_page_token,
    }

# Example: Browse men's running shoes, filtered by Nike brand
results = browse_category(
    "my-project",
    "Shoes > Running Shoes > Men's",
    active_filters={"brands": ["Nike"]},
    page_size=24
)

print(f"Total products: {results['total']}")
print(f"\nAvailable brands:")
for v in results["facets"].get("brands", {}).get("values", []):
    print(f"  {v['value']}: {v['count']} products")
```

## Step 3: Implement Dynamic Facet Ordering

Different categories should show different facets in different orders. A clothing category needs size prominently, while electronics needs storage capacity.

This configuration maps categories to their facet priority:

```python
# Category-specific facet ordering configuration
CATEGORY_FACET_CONFIG = {
    "Shoes": {
        "facet_order": ["brands", "sizes", "colorFamilies", "price", "attributes.material"],
        "default_expanded": ["brands", "sizes", "price"],
    },
    "Electronics": {
        "facet_order": ["brands", "price", "attributes.storage", "attributes.screen_size", "colorFamilies"],
        "default_expanded": ["brands", "price", "attributes.storage"],
    },
    "Clothing": {
        "facet_order": ["brands", "sizes", "colorFamilies", "price", "attributes.material", "attributes.fit"],
        "default_expanded": ["sizes", "colorFamilies", "price"],
    },
}

def get_ordered_facets(category, raw_facets):
    """Orders facets based on category-specific configuration."""
    # Find the matching category config
    config = None
    for cat_key, cat_config in CATEGORY_FACET_CONFIG.items():
        if cat_key in category:
            config = cat_config
            break

    if not config:
        # Return facets in default order if no config found
        return raw_facets

    ordered = {}
    for facet_key in config["facet_order"]:
        if facet_key in raw_facets:
            facet_data = raw_facets[facet_key]
            facet_data["expanded"] = facet_key in config["default_expanded"]
            ordered[facet_key] = facet_data

    # Append any remaining facets not in the config
    for key, value in raw_facets.items():
        if key not in ordered:
            value["expanded"] = False
            ordered[key] = value

    return ordered
```

## Step 4: Build the Frontend Facet Component

Here is a JavaScript implementation for rendering facets and handling filter interactions:

```javascript
// Render faceted navigation sidebar
function renderFacets(facets, activeFilters) {
  const sidebar = document.getElementById('facet-sidebar');
  sidebar.innerHTML = '';

  Object.entries(facets).forEach(([key, facet]) => {
    const section = document.createElement('div');
    section.className = 'facet-section';

    // Facet header with expand/collapse toggle
    const header = document.createElement('h4');
    header.textContent = formatFacetLabel(key);
    header.onclick = () => section.classList.toggle('collapsed');
    section.appendChild(header);

    // Facet values list
    const list = document.createElement('ul');
    list.className = 'facet-values';

    facet.values.forEach(item => {
      const li = document.createElement('li');
      const isActive = (activeFilters[key] || []).includes(item.value || `${item.min}-${item.max}`);

      if (item.value) {
        // Text value facet
        li.innerHTML = `
          <label class="${isActive ? 'active' : ''}">
            <input type="checkbox" ${isActive ? 'checked' : ''}
              onchange="toggleFilter('${key}', '${item.value}')" />
            ${item.value} <span class="count">(${item.count})</span>
          </label>`;
      } else {
        // Price range facet
        const rangeLabel = `$${item.min} - $${item.max}`;
        li.innerHTML = `
          <label class="${isActive ? 'active' : ''}">
            <input type="checkbox" ${isActive ? 'checked' : ''}
              onchange="togglePriceFilter(${item.min}, ${item.max})" />
            ${rangeLabel} <span class="count">(${item.count})</span>
          </label>`;
      }
      list.appendChild(li);
    });

    section.appendChild(list);
    sidebar.appendChild(section);
  });
}

// Format facet keys into readable labels
function formatFacetLabel(key) {
  const labels = {
    'brands': 'Brand',
    'colorFamilies': 'Color',
    'sizes': 'Size',
    'price': 'Price Range',
    'attributes.material': 'Material',
    'attributes.rating': 'Rating',
  };
  return labels[key] || key.replace('attributes.', '').replace(/_/g, ' ');
}

// Toggle a filter selection and re-fetch results
function toggleFilter(facetKey, value) {
  const filters = getCurrentFilters();
  if (!filters[facetKey]) filters[facetKey] = [];

  const index = filters[facetKey].indexOf(value);
  if (index > -1) {
    filters[facetKey].splice(index, 1);
  } else {
    filters[facetKey].push(value);
  }

  updateURLParams(filters);
  fetchBrowseResults(filters);
}
```

## Summary

Configuring facets and filters for e-commerce browse pages on Vertex AI Search for Commerce involves defining facet specifications in your search requests, handling different facet types (text values, numeric intervals, price ranges), and building a frontend that renders the facets and manages filter state. The key to a good faceted navigation experience is category-specific facet ordering, showing the most relevant filters first, and keeping facet counts updated as users apply filters. Start with the basic facets that match your product attributes, then iterate based on what your customers actually use to narrow their searches.
