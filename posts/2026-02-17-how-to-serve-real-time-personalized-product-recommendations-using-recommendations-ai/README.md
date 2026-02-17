# How to Serve Real-Time Personalized Product Recommendations Using Recommendations AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Recommendations AI, Personalization, Real-Time, Ecommerce

Description: Learn how to serve real-time personalized product recommendations to users using Google Cloud Recommendations AI with low latency and high relevance.

---

Having a trained recommendation model is only half the battle. The other half is serving those recommendations to users in real time, with low latency, proper filtering, and fallback strategies. When a user loads your homepage or views a product, you need recommendations back within a few hundred milliseconds. Any longer and you either show a loading spinner (bad UX) or render the page without recommendations (wasted opportunity).

This guide covers the practical aspects of serving recommendations in production - from making prediction requests to handling edge cases like new users and empty results.

## The Prediction API

Recommendations AI serves predictions through the Retail API's Predict method. Each call takes a user context and returns a ranked list of product recommendations.

```python
from google.cloud import retail_v2

# Initialize the prediction client
predict_client = retail_v2.PredictionServiceClient()

def get_recommendations(project_id, serving_config_id, visitor_id,
                         user_id=None, page_size=12):
    """Get real-time product recommendations for a user."""
    placement = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog"
        f"/servingConfigs/{serving_config_id}"
    )

    # Build the user event context
    user_event = retail_v2.UserEvent(
        event_type="home-page-view",
        visitor_id=visitor_id,
    )

    if user_id:
        user_event.user_info = retail_v2.UserInfo(user_id=user_id)

    request = retail_v2.PredictRequest(
        placement=placement,
        user_event=user_event,
        page_size=page_size,
    )

    response = predict_client.predict(request=request)
    return response
```

## Serving Recommendations on Different Pages

Different pages need different recommendation contexts. The event type you pass tells the model what kind of page the user is on.

```python
def get_homepage_recommendations(visitor_id, user_id=None):
    """Recommendations for the homepage - general personalized picks."""
    user_event = retail_v2.UserEvent(
        event_type="home-page-view",
        visitor_id=visitor_id,
    )
    if user_id:
        user_event.user_info = retail_v2.UserInfo(user_id=user_id)

    return make_prediction_request(user_event, "homepage-recs")

def get_pdp_recommendations(visitor_id, product_id, user_id=None):
    """Recommendations on a product detail page - similar/complementary items."""
    user_event = retail_v2.UserEvent(
        event_type="detail-page-view",
        visitor_id=visitor_id,
        product_details=[
            retail_v2.ProductDetail(
                product=retail_v2.Product(id=product_id),
                quantity=1
            )
        ]
    )
    if user_id:
        user_event.user_info = retail_v2.UserInfo(user_id=user_id)

    return make_prediction_request(user_event, "pdp-recs")

def get_cart_recommendations(visitor_id, cart_product_ids, user_id=None):
    """Recommendations on the cart page - items to add to the order."""
    product_details = [
        retail_v2.ProductDetail(
            product=retail_v2.Product(id=pid),
            quantity=1
        )
        for pid in cart_product_ids
    ]

    user_event = retail_v2.UserEvent(
        event_type="shopping-cart-page-view",
        visitor_id=visitor_id,
        product_details=product_details
    )
    if user_id:
        user_event.user_info = retail_v2.UserInfo(user_id=user_id)

    return make_prediction_request(user_event, "cart-recs")

def make_prediction_request(user_event, serving_config_id):
    """Common function to make prediction requests."""
    placement = (
        f"projects/my-gcp-project/locations/global"
        f"/catalogs/default_catalog"
        f"/servingConfigs/{serving_config_id}"
    )

    request = retail_v2.PredictRequest(
        placement=placement,
        user_event=user_event,
        page_size=12,
        filter='availability: ANY("IN_STOCK")',
    )

    return predict_client.predict(request=request)
```

## Filtering Recommendations

Use filter expressions to exclude certain products from recommendations.

```python
def get_filtered_recommendations(visitor_id, user_id=None):
    """Get recommendations with business rule filters applied."""
    user_event = retail_v2.UserEvent(
        event_type="home-page-view",
        visitor_id=visitor_id,
    )
    if user_id:
        user_event.user_info = retail_v2.UserInfo(user_id=user_id)

    placement = (
        f"projects/my-gcp-project/locations/global"
        f"/catalogs/default_catalog"
        f"/servingConfigs/homepage-recs"
    )

    # Filter expressions control what gets recommended
    # Only show in-stock items
    filter_expr = 'availability: ANY("IN_STOCK")'

    # You can also filter by custom attributes
    # filter_expr = 'attributes.brand: ANY("Nike", "Adidas")'

    # Or filter by category
    # filter_expr = 'categories: ANY("Electronics")'

    # Combine filters
    # filter_expr = 'availability: ANY("IN_STOCK") AND attributes.brand: ANY("Nike")'

    request = retail_v2.PredictRequest(
        placement=placement,
        user_event=user_event,
        page_size=12,
        filter=filter_expr,
    )

    return predict_client.predict(request=request)
```

## Building a REST API for Recommendations

Wrap the prediction calls in a REST API that your frontend can call.

```python
from flask import Flask, request, jsonify
from google.cloud import retail_v2
import time

app = Flask(__name__)
predict_client = retail_v2.PredictionServiceClient()

PROJECT_ID = "my-gcp-project"

@app.route("/api/recommendations/homepage", methods=["GET"])
def homepage_recommendations():
    """Serve homepage recommendations via REST API."""
    visitor_id = request.args.get("visitor_id")
    user_id = request.args.get("user_id")
    count = int(request.args.get("count", 12))

    if not visitor_id:
        return jsonify({"error": "visitor_id required"}), 400

    start_time = time.time()

    try:
        user_event = retail_v2.UserEvent(
            event_type="home-page-view",
            visitor_id=visitor_id,
        )
        if user_id:
            user_event.user_info = retail_v2.UserInfo(user_id=user_id)

        placement = (
            f"projects/{PROJECT_ID}/locations/global"
            f"/catalogs/default_catalog/servingConfigs/homepage-recs"
        )

        response = predict_client.predict(
            request=retail_v2.PredictRequest(
                placement=placement,
                user_event=user_event,
                page_size=count,
                filter='availability: ANY("IN_STOCK")',
            )
        )

        # Format the response for the frontend
        recommendations = []
        for result in response.results:
            rec = {"product_id": result.id}
            if result.metadata:
                rec["metadata"] = dict(result.metadata)
            recommendations.append(rec)

        latency_ms = (time.time() - start_time) * 1000

        return jsonify({
            "recommendations": recommendations,
            "count": len(recommendations),
            "latency_ms": round(latency_ms, 1)
        })

    except Exception as e:
        # Return fallback recommendations on error
        return jsonify({
            "recommendations": get_fallback_recommendations(count),
            "fallback": True,
            "error": str(e)
        })

def get_fallback_recommendations(count):
    """Return popular products when the recommendation service is unavailable."""
    # In production, cache popular products and return them as fallback
    return [
        {"product_id": f"popular-{i}", "fallback": True}
        for i in range(count)
    ]
```

## Handling the Cold Start Problem

New users with no browsing history present a challenge. The model has no personal data to work with. Here is how to handle it.

```python
def get_smart_recommendations(visitor_id, user_id=None, page_size=12):
    """Get recommendations with cold start handling."""

    # First, try personalized recommendations
    try:
        response = get_recommendations(
            "my-gcp-project", "homepage-recs",
            visitor_id, user_id, page_size
        )

        if response.results:
            return {
                "type": "personalized",
                "products": [r.id for r in response.results]
            }
    except Exception:
        pass

    # Fallback: trending/popular products
    return {
        "type": "popular",
        "products": get_popular_products(page_size)
    }

def get_popular_products(count):
    """Fetch popular products as a cold start fallback."""
    # Query your database for best sellers or trending items
    # This could come from BigQuery, Firestore, or a cache
    return ["popular-1", "popular-2", "popular-3"][:count]
```

## Caching for Performance

The Predict API is fast, but caching can reduce latency further and save on API costs.

```python
from functools import lru_cache
import hashlib
import json
import redis

# Redis-based caching for recommendations
redis_client = redis.Redis(host="redis-host", port=6379)

def get_cached_recommendations(visitor_id, user_id, serving_config,
                                page_size=12, cache_ttl=300):
    """Get recommendations with Redis caching."""
    # Build a cache key
    cache_key = f"recs:{serving_config}:{user_id or visitor_id}:{page_size}"

    # Check cache first
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # Cache miss - fetch from Recommendations AI
    response = get_recommendations(
        "my-gcp-project", serving_config,
        visitor_id, user_id, page_size
    )

    result = [r.id for r in response.results]

    # Cache for 5 minutes (recommendations change slowly)
    redis_client.setex(cache_key, cache_ttl, json.dumps(result))

    return result
```

## Monitoring Recommendation Quality

Track how well recommendations perform in production.

```python
def log_recommendation_interaction(visitor_id, recommended_product_id,
                                     action, serving_config_id):
    """Log when a user interacts with a recommended product."""
    # Track impressions, clicks, and purchases on recommended items
    metrics = {
        "visitor_id": visitor_id,
        "product_id": recommended_product_id,
        "action": action,  # "impression", "click", "purchase"
        "serving_config": serving_config_id,
        "timestamp": datetime.utcnow().isoformat()
    }

    # Store in your analytics system
    # Calculate CTR = clicks / impressions
    # Calculate CVR = purchases / clicks
    print(f"Recommendation {action}: {recommended_product_id}")
```

## Wrapping Up

Serving real-time recommendations requires more than just calling the Predict API. You need to handle different page contexts, filter by business rules, manage cold start scenarios for new users, implement caching for performance, and build fallback strategies for when the service is temporarily unavailable. The Predict API itself is designed for low-latency responses, typically returning results in under 200 milliseconds. Combined with caching and proper error handling, you can deliver personalized recommendations reliably across your entire application.
