# How to Set Up a Product Catalog for Google Cloud Recommendations AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Recommendations AI, Product Catalog, Retail API, Ecommerce

Description: Learn how to set up and import a product catalog into Google Cloud Recommendations AI to power personalized product recommendations on your ecommerce platform.

---

Before Recommendations AI can suggest products to your users, it needs to know what products you sell. The product catalog is the foundation of the entire recommendation system. It contains your product metadata - titles, descriptions, categories, prices, images, availability - everything the recommendation engine needs to understand your inventory and make intelligent suggestions.

Getting the catalog right is critical. Poor catalog data leads to poor recommendations. This guide walks through setting up, structuring, and importing your product catalog into Recommendations AI.

## Understanding the Catalog Structure

Recommendations AI uses the Retail API's catalog format. Each product in your catalog can include:

- **Product ID**: Your unique identifier for the product
- **Title**: The product name
- **Categories**: Hierarchical product categories (e.g., "Electronics > Phones > Smartphones")
- **Description**: Product description text
- **Availability**: In stock, out of stock, preorder, backorder
- **Price information**: Original price and sale price
- **Images**: Product image URLs
- **Tags**: Custom tags for filtering
- **Attributes**: Custom key-value pairs for product properties (color, size, brand, etc.)

## Prerequisites

Enable the Retail API and set up your project.

```bash
# Enable the Retail API (which includes Recommendations AI)
gcloud services enable retail.googleapis.com

# Install the Python client library
pip install google-cloud-retail
```

## Creating the Default Catalog Branch

Recommendations AI organizes products into catalogs and branches. The default branch is where your live catalog lives.

```python
from google.cloud import retail_v2

def get_default_catalog(project_id, location="global"):
    """Get the default catalog configuration."""
    client = retail_v2.CatalogServiceClient()

    # List catalogs in the project
    parent = f"projects/{project_id}/locations/{location}"
    request = retail_v2.ListCatalogsRequest(parent=parent)

    catalogs = client.list_catalogs(request=request)

    for catalog in catalogs:
        print(f"Catalog: {catalog.name}")
        print(f"Display name: {catalog.display_name}")

    return catalogs

get_default_catalog("my-gcp-project")
```

## Importing Products One at a Time

For small catalogs or real-time updates, you can add products individually.

```python
from google.cloud import retail_v2
from google.protobuf import field_mask_pb2

def create_product(project_id, product_data):
    """Create a single product in the catalog."""
    client = retail_v2.ProductServiceClient()

    # The parent is your default branch
    parent = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog/branches/default_branch"
    )

    # Build the product object
    product = retail_v2.Product(
        title=product_data["title"],
        categories=product_data.get("categories", []),
        description=product_data.get("description", ""),
        availability=retail_v2.Product.Availability.IN_STOCK,
        price_info=retail_v2.PriceInfo(
            currency_code="USD",
            price=product_data.get("price", 0.0),
            original_price=product_data.get("original_price", 0.0),
        ),
        uri=product_data.get("uri", ""),
    )

    # Add custom attributes
    for key, value in product_data.get("attributes", {}).items():
        product.attributes[key] = retail_v2.CustomAttribute(
            text=[value] if isinstance(value, str) else value
        )

    # Create the product
    request = retail_v2.CreateProductRequest(
        parent=parent,
        product=product,
        product_id=product_data["id"]
    )

    created_product = client.create_product(request=request)
    print(f"Created product: {created_product.name}")
    return created_product

# Create a sample product
create_product("my-gcp-project", {
    "id": "SKU-12345",
    "title": "Wireless Bluetooth Headphones",
    "categories": ["Electronics > Audio > Headphones"],
    "description": "Premium wireless headphones with noise cancellation",
    "price": 79.99,
    "original_price": 99.99,
    "uri": "https://mystore.com/products/wireless-headphones",
    "attributes": {
        "brand": "AudioMax",
        "color": ["Black", "White", "Blue"],
        "connectivity": "Bluetooth 5.0"
    }
})
```

## Bulk Importing Products from Cloud Storage

For larger catalogs, bulk import from a file in Cloud Storage is much more efficient.

First, prepare your product data as a JSON Lines file (one JSON object per line).

```python
import json

def prepare_catalog_file(products, output_path):
    """Create a JSONL file for bulk catalog import."""
    with open(output_path, "w") as f:
        for product in products:
            # Format each product according to the Retail API schema
            product_json = {
                "id": product["id"],
                "title": product["title"],
                "categories": product.get("categories", []),
                "description": product.get("description", ""),
                "availability": "IN_STOCK",
                "priceInfo": {
                    "currencyCode": "USD",
                    "price": product.get("price", 0),
                    "originalPrice": product.get("original_price", 0)
                },
                "uri": product.get("uri", "")
            }

            # Add attributes if present
            if "attributes" in product:
                product_json["attributes"] = {}
                for key, value in product["attributes"].items():
                    if isinstance(value, list):
                        product_json["attributes"][key] = {"text": value}
                    else:
                        product_json["attributes"][key] = {"text": [value]}

            f.write(json.dumps(product_json) + "\n")

    print(f"Wrote {len(products)} products to {output_path}")

# Sample product list
products = [
    {
        "id": f"SKU-{i:05d}",
        "title": f"Product {i}",
        "categories": ["Electronics > Gadgets"],
        "price": 29.99 + i,
        "uri": f"https://mystore.com/products/{i}"
    }
    for i in range(1, 1001)
]

prepare_catalog_file(products, "catalog.jsonl")
```

Upload the file and trigger the import.

```bash
# Upload the catalog file to Cloud Storage
gsutil cp catalog.jsonl gs://my-project-retail-data/catalogs/
```

```python
from google.cloud import retail_v2

def bulk_import_products(project_id, gcs_uri):
    """Import products in bulk from a JSONL file in Cloud Storage."""
    client = retail_v2.ProductServiceClient()

    parent = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog/branches/default_branch"
    )

    # Configure the import source
    input_config = retail_v2.ProductInputConfig(
        gcs_source=retail_v2.GcsSource(
            input_uris=[gcs_uri],
            data_schema="product"
        )
    )

    request = retail_v2.ImportProductsRequest(
        parent=parent,
        input_config=input_config,
        reconciliation_mode=retail_v2.ImportProductsRequest.ReconciliationMode.INCREMENTAL
    )

    # Start the import operation
    operation = client.import_products(request=request)
    print("Import started. This may take several minutes...")

    result = operation.result(timeout=600)

    print(f"Import complete!")
    print(f"Successfully imported: {result.success_count}")
    print(f"Failed: {result.failure_count}")

    if result.error_samples:
        print("Sample errors:")
        for error in result.error_samples[:5]:
            print(f"  {error.message}")

    return result

# Run the bulk import
bulk_import_products(
    "my-gcp-project",
    "gs://my-project-retail-data/catalogs/catalog.jsonl"
)
```

## Updating Products

Products change - prices fluctuate, items go out of stock, descriptions get updated. Here is how to handle updates.

```python
from google.cloud import retail_v2
from google.protobuf import field_mask_pb2

def update_product(project_id, product_id, updates):
    """Update specific fields of an existing product."""
    client = retail_v2.ProductServiceClient()

    product_name = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog/branches/default_branch"
        f"/products/{product_id}"
    )

    # Build the product with only the fields to update
    product = retail_v2.Product(name=product_name)

    update_paths = []

    if "price" in updates:
        product.price_info = retail_v2.PriceInfo(
            currency_code="USD",
            price=updates["price"]
        )
        update_paths.append("price_info")

    if "availability" in updates:
        availability_map = {
            "in_stock": retail_v2.Product.Availability.IN_STOCK,
            "out_of_stock": retail_v2.Product.Availability.OUT_OF_STOCK,
            "preorder": retail_v2.Product.Availability.PREORDER,
        }
        product.availability = availability_map.get(
            updates["availability"],
            retail_v2.Product.Availability.IN_STOCK
        )
        update_paths.append("availability")

    if "title" in updates:
        product.title = updates["title"]
        update_paths.append("title")

    # Specify which fields to update
    update_mask = field_mask_pb2.FieldMask(paths=update_paths)

    request = retail_v2.UpdateProductRequest(
        product=product,
        update_mask=update_mask
    )

    updated = client.update_product(request=request)
    print(f"Updated product: {updated.name}")
    return updated

# Mark a product as out of stock
update_product("my-gcp-project", "SKU-12345", {
    "availability": "out_of_stock"
})

# Update price
update_product("my-gcp-project", "SKU-12345", {
    "price": 69.99
})
```

## Keeping Your Catalog in Sync

For production systems, you need a reliable sync mechanism between your product database and the Recommendations AI catalog.

```python
import time

def sync_catalog(project_id, product_database):
    """Sync your product database with the Recommendations AI catalog."""
    client = retail_v2.ProductServiceClient()
    parent = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog/branches/default_branch"
    )

    synced = 0
    errors = 0

    for product in product_database.get_all_products():
        try:
            product_name = f"{parent}/products/{product['id']}"

            retail_product = retail_v2.Product(
                name=product_name,
                title=product["title"],
                availability=(
                    retail_v2.Product.Availability.IN_STOCK
                    if product["in_stock"]
                    else retail_v2.Product.Availability.OUT_OF_STOCK
                ),
                price_info=retail_v2.PriceInfo(
                    currency_code="USD",
                    price=product["price"]
                ),
                uri=product["url"]
            )

            # Use update with allow_missing to create or update
            request = retail_v2.UpdateProductRequest(
                product=retail_product,
                allow_missing=True
            )

            client.update_product(request=request)
            synced += 1

            # Respect rate limits
            time.sleep(0.05)

        except Exception as e:
            print(f"Error syncing {product['id']}: {e}")
            errors += 1

    print(f"Sync complete. Synced: {synced}, Errors: {errors}")
```

## Best Practices for Catalog Quality

Your recommendations are only as good as your catalog data. Follow these guidelines:

- **Use descriptive titles**: "Women's Running Shoes - Nike Air Max 270 - Black/White" is better than "Shoe Model 270BW"
- **Include hierarchical categories**: Use the full path like "Apparel > Women > Shoes > Running"
- **Keep availability current**: Recommending out-of-stock items frustrates users
- **Include images**: Products with images get higher click-through rates
- **Use consistent attributes**: If you track "color" for some products, track it for all
- **Update prices in real time**: Stale prices erode trust

## Wrapping Up

Setting up a product catalog for Recommendations AI is the essential first step toward personalized recommendations. Take the time to structure your data well, include rich metadata, and set up reliable sync mechanisms. The bulk import API handles large catalogs efficiently, while the individual product API works for real-time updates. Once your catalog is populated and current, Recommendations AI has the foundation it needs to start learning from user behavior and generating relevant product suggestions.
