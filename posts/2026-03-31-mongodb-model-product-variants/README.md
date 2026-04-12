# How to Model Product Variants in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, E-Commerce, Schema Design, Product, Modeling

Description: Design MongoDB schemas for products with variants like size and color, balancing query performance, inventory accuracy, and catalog flexibility.

---

## The Product Variants Challenge

An e-commerce product like a t-shirt can have multiple variants: sizes (S, M, L, XL) and colors (red, blue, green). Each combination is a distinct SKU with its own price, stock, and images. The schema must support:
- Querying available sizes/colors for a product
- Tracking inventory per variant
- Different prices per variant
- Filtering the catalog by attribute values

## Approach 1: Embedded Variants (Recommended for Most Cases)

Store all variants as an array within the parent product document:

```javascript
{
  _id: "prod_tshirt_001",
  name: "Classic Cotton T-Shirt",
  slug: "classic-cotton-t-shirt",
  description: "100% cotton crew neck t-shirt",
  category: "apparel",
  brand: "BasicCo",

  // Variant attributes define what varies (for UI filtering)
  options: [
    { name: "size", values: ["S", "M", "L", "XL"] },
    { name: "color", values: ["red", "blue", "white"] }
  ],

  variants: [
    {
      _id: "sku_001",
      sku: "TCT-S-RED",
      attributes: { size: "S", color: "red" },
      price: 2499,
      compareAtPrice: 2999,
      inventory: 15,
      images: ["red-front.jpg", "red-back.jpg"],
      weight: 200,
      barcode: "1234567890123"
    },
    {
      _id: "sku_002",
      sku: "TCT-M-RED",
      attributes: { size: "M", color: "red" },
      price: 2499,
      inventory: 23,
      images: ["red-front.jpg"]
    }
    // ... more variants
  ],

  status: "active",
  createdAt: ISODate("2026-01-01T00:00:00Z")
}
```

## Querying Variants

```javascript
// Find products that have a medium size in stock
db.products.find({
  "variants": {
    $elemMatch: {
      "attributes.size": "M",
      inventory: { $gt: 0 }
    }
  }
})

// Get all available colors for a product
db.products.aggregate([
  { $match: { _id: "prod_tshirt_001" } },
  { $unwind: "$variants" },
  { $match: { "variants.inventory": { $gt: 0 } } },
  { $group: { _id: "$variants.attributes.color" } }
])
```

## Indexes for Variant Queries

```javascript
// Filter catalog by variant attributes
db.products.createIndex({ "variants.attributes.size": 1, status: 1 })
db.products.createIndex({ "variants.attributes.color": 1, status: 1 })

// SKU lookup
db.products.createIndex({ "variants.sku": 1 }, { unique: true, sparse: true })

// Stock availability
db.products.createIndex({ "variants.inventory": 1 })
```

## Approach 2: Separate Variants Collection (For Large Catalogs)

For products with hundreds of variants or frequent per-SKU updates, store variants in a separate collection:

```javascript
// products collection - metadata only
{
  _id: "prod_tshirt_001",
  name: "Classic Cotton T-Shirt",
  options: [{ name: "size" }, { name: "color" }]
}

// product_variants collection
{
  _id: "sku_001",
  productId: "prod_tshirt_001",
  sku: "TCT-S-RED",
  attributes: { size: "S", color: "red" },
  price: 2499,
  inventory: 15
}
```

```javascript
db.product_variants.createIndex({ productId: 1, "attributes.size": 1 })
db.product_variants.createIndex({ sku: 1 }, { unique: true })
```

## Updating Variant Inventory

Use the positional `$` operator for atomic inventory updates:

```javascript
async function decrementInventory(productId, variantSku, quantity) {
  const result = await db.collection("products").updateOne(
    {
      _id: productId,
      variants: {
        $elemMatch: {
          sku: variantSku,
          inventory: { $gte: quantity }
        }
      }
    },
    {
      $inc: { "variants.$.inventory": -quantity }
    }
  );

  if (result.modifiedCount === 0) {
    throw new Error("Insufficient inventory or variant not found");
  }
}
```

## Summary

Product variant modeling in MongoDB typically uses embedded variants for simplicity and atomic inventory updates via the positional operator. The embedded approach works well for products with up to a few dozen variants and supports efficient queries using `$elemMatch`. For large catalogs or products with hundreds of variants, a separate `product_variants` collection avoids document size growth and allows more efficient per-SKU index lookups. Index on `variants.attributes.*` fields to support catalog filtering by color, size, or other attributes.
