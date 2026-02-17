# How to Set Up Vision API Product Search for Visual Product Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Vision API, Product Search, Visual Search, E-Commerce

Description: A complete guide to setting up Google Cloud Vision API Product Search for building visual product discovery features in e-commerce applications.

---

Visual product search is one of those features that users love once they experience it. Instead of typing keywords to find a product, they can snap a photo or upload an image and instantly find matching or similar products from your catalog. Google Cloud Vision API Product Search makes building this capability surprisingly approachable, even if you have a large product catalog.

In this post, I will walk through the entire process of setting up Vision API Product Search, from creating a product set to querying it with images.

## How Product Search Works

The architecture has a few key components:

**Product Set**: A collection of products that can be searched. Think of it as a searchable catalog. You can have multiple product sets for different categories or markets.

**Products**: Individual items in your catalog, each with metadata like display name, category, and custom labels.

**Reference Images**: One or more images associated with each product. These are the images the API uses to match against search queries. More reference images per product generally means better matching accuracy.

**Search**: When a user submits a query image, the API compares it against all reference images in the product set and returns the best matches with similarity scores.

The flow looks like this:

```mermaid
graph LR
    A[Create Product Set] --> B[Add Products]
    B --> C[Upload Reference Images]
    C --> D[Index Builds Automatically]
    D --> E[Search with Query Image]
    E --> F[Get Matching Products]
```

## Prerequisites

Before getting started:

```bash
# Enable the Vision API
gcloud services enable vision.googleapis.com

# Install the Python client library
pip install google-cloud-vision

# Create a GCS bucket for reference images
gsutil mb -l us-central1 gs://your-product-images-bucket
```

## Step 1: Create a Product Set

A product set groups related products for searching:

```python
from google.cloud import vision

def create_product_set(project_id, location, product_set_id, display_name):
    """Create a new product set for visual search."""
    client = vision.ProductSearchClient()

    # Build the location path
    location_path = f"projects/{project_id}/locations/{location}"

    # Define the product set
    product_set = vision.ProductSet(display_name=display_name)

    # Create it
    response = client.create_product_set(
        parent=location_path,
        product_set=product_set,
        product_set_id=product_set_id,
    )

    print(f"Product set created: {response.name}")
    return response

# Create a product set for shoes
create_product_set(
    project_id="your-project-id",
    location="us-central1",
    product_set_id="shoe-catalog",
    display_name="Shoe Catalog"
)
```

## Step 2: Add Products

Now add individual products to your set:

```python
from google.cloud import vision

def create_product(project_id, location, product_id, display_name, category):
    """Create a product with metadata."""
    client = vision.ProductSearchClient()
    location_path = f"projects/{project_id}/locations/{location}"

    # Define the product with its category
    # Categories: homegoods-v2, apparel-v2, toys-v2, packagedgoods-v1, general-v1
    product = vision.Product(
        display_name=display_name,
        product_category=category,
        product_labels=[
            vision.Product.KeyValue(key="color", value="red"),
            vision.Product.KeyValue(key="brand", value="ExampleBrand"),
            vision.Product.KeyValue(key="style", value="running"),
        ],
    )

    response = client.create_product(
        parent=location_path,
        product=product,
        product_id=product_id,
    )

    print(f"Product created: {response.name}")
    return response

def add_product_to_set(project_id, location, product_id, product_set_id):
    """Add an existing product to a product set."""
    client = vision.ProductSearchClient()

    product_path = f"projects/{project_id}/locations/{location}/products/{product_id}"
    product_set_path = f"projects/{project_id}/locations/{location}/productSets/{product_set_id}"

    client.add_product_to_product_set(
        name=product_set_path,
        product=product_path,
    )

    print(f"Product {product_id} added to set {product_set_id}")

# Create a product and add it to the set
create_product(
    project_id="your-project-id",
    location="us-central1",
    product_id="red-running-shoe-001",
    display_name="Red Running Shoe Model X",
    category="apparel-v2",
)

add_product_to_set(
    project_id="your-project-id",
    location="us-central1",
    product_id="red-running-shoe-001",
    product_set_id="shoe-catalog",
)
```

## Step 3: Upload Reference Images

Each product needs at least one reference image. More images from different angles improve matching:

```python
from google.cloud import vision

def add_reference_image(project_id, location, product_id, image_id, gcs_uri):
    """Add a reference image to a product from Cloud Storage."""
    client = vision.ProductSearchClient()

    product_path = f"projects/{project_id}/locations/{location}/products/{product_id}"

    # The reference image must be in GCS
    reference_image = vision.ReferenceImage(uri=gcs_uri)

    response = client.create_reference_image(
        parent=product_path,
        reference_image=reference_image,
        reference_image_id=image_id,
    )

    print(f"Reference image created: {response.name}")
    return response

# Add multiple reference images for better matching
add_reference_image(
    project_id="your-project-id",
    location="us-central1",
    product_id="red-running-shoe-001",
    image_id="front-view",
    gcs_uri="gs://your-product-images-bucket/shoes/red-runner-front.jpg",
)

add_reference_image(
    project_id="your-project-id",
    location="us-central1",
    product_id="red-running-shoe-001",
    image_id="side-view",
    gcs_uri="gs://your-product-images-bucket/shoes/red-runner-side.jpg",
)
```

## Bulk Import from CSV

For large catalogs, use bulk import with a CSV file in Cloud Storage:

```python
from google.cloud import vision

def bulk_import_products(project_id, location, csv_gcs_uri):
    """Import products in bulk from a CSV file in GCS."""
    client = vision.ProductSearchClient()
    location_path = f"projects/{project_id}/locations/{location}"

    # The CSV format is:
    # gs://bucket/image.jpg,image-id,product-set-id,product-id,product-category,display-name,labels,bounding-poly
    input_config = vision.ImportProductSetsInputConfig(
        gcs_source=vision.ImportProductSetsGcsSource(csv_file_uri=csv_gcs_uri)
    )

    # This is a long-running operation
    operation = client.import_product_sets(
        parent=location_path,
        input_config=input_config,
    )

    print("Waiting for import to complete...")
    result = operation.result(timeout=600)

    print(f"Import complete. {len(result.statuses)} items processed")

    # Check for any errors
    for i, status in enumerate(result.statuses):
        if status.code != 0:
            print(f"Error on item {i}: {status.message}")

    return result

# Import from a CSV file
bulk_import_products(
    project_id="your-project-id",
    location="us-central1",
    csv_gcs_uri="gs://your-product-images-bucket/catalog/products.csv",
)
```

## Step 4: Search for Similar Products

After the index is built (which happens automatically and usually takes about 30 minutes after the first import), you can search:

```python
from google.cloud import vision

def search_similar_products(project_id, location, product_set_id, image_path, max_results=10):
    """Search for visually similar products using a query image."""
    client = vision.ImageAnnotatorClient()

    # Load the query image
    with open(image_path, "rb") as f:
        content = f.read()

    image = vision.Image(content=content)

    # Configure the product search parameters
    product_set_path = f"projects/{project_id}/locations/{location}/productSets/{product_set_id}"

    product_search_params = vision.ProductSearchParams(
        product_set=product_set_path,
        product_categories=["apparel-v2"],  # Search within this category
        filter="color=red",  # Optional: filter by product labels
    )

    image_context = vision.ImageContext(
        product_search_params=product_search_params
    )

    # Execute the search
    response = client.product_search(
        image=image,
        image_context=image_context,
        max_results=max_results,
    )

    results = response.product_search_results

    # Print the product group results (grouped by product)
    print(f"Found {len(results.product_grouped_results)} product groups\n")

    for group in results.product_grouped_results:
        # Bounding box of the detected product in the query image
        box = group.bounding_poly
        print(f"Product detected at: {[(v.x, v.y) for v in box.normalized_vertices]}")

        for result in group.results:
            product = result.product
            print(f"  Match: {product.display_name}")
            print(f"  Score: {result.score:.4f}")
            print(f"  Image: {result.image}")

            # Print product labels
            for label in product.product_labels:
                print(f"  {label.key}: {label.value}")
            print()

    return results

# Search with a user's photo
results = search_similar_products(
    project_id="your-project-id",
    location="us-central1",
    product_set_id="shoe-catalog",
    image_path="user_photo.jpg",
)
```

## Managing Your Product Catalog

Products and reference images need maintenance as your catalog changes:

```python
from google.cloud import vision

def update_product_labels(project_id, location, product_id, new_labels):
    """Update the labels on an existing product."""
    client = vision.ProductSearchClient()
    product_path = f"projects/{project_id}/locations/{location}/products/{product_id}"

    product = vision.Product(
        name=product_path,
        product_labels=[
            vision.Product.KeyValue(key=k, value=v)
            for k, v in new_labels.items()
        ],
    )

    # Update only the product_labels field
    updated = client.update_product(
        product=product,
        update_mask={"paths": ["product_labels"]},
    )

    print(f"Updated product labels: {updated.name}")
    return updated

def delete_product(project_id, location, product_id):
    """Remove a product from the catalog."""
    client = vision.ProductSearchClient()
    product_path = f"projects/{project_id}/locations/{location}/products/{product_id}"

    client.delete_product(name=product_path)
    print(f"Deleted product: {product_id}")

# Update labels for a product
update_product_labels(
    project_id="your-project-id",
    location="us-central1",
    product_id="red-running-shoe-001",
    new_labels={"color": "red", "brand": "ExampleBrand", "sale": "true"},
)
```

## Performance Tips

- Add at least 3 to 5 reference images per product from different angles for the best matching accuracy.
- Use the product category filter to narrow search scope and improve speed.
- Keep reference images clean - good lighting, clear backgrounds, and minimal clutter improve results.
- The search index updates automatically, but there is a lag of up to 30 minutes after adding or removing products.
- Use label filters in search queries to narrow results when users provide additional context.

## Wrapping Up

Vision API Product Search gives you a production-ready visual search system without training any custom models. The setup is a bit involved since you need to structure your catalog with product sets, products, and reference images, but once it is running, the search quality is solid.

For monitoring the uptime and performance of your visual search endpoints in production, consider [OneUptime](https://oneuptime.com) to ensure your product discovery experience stays reliable for your customers.
