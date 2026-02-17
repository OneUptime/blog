# How to Implement Recommendations AI on Product Detail Pages for Cross-Selling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Recommendations AI, Cross-Selling, Product Pages, Ecommerce

Description: Learn how to implement Google Cloud Recommendations AI on product detail pages to suggest complementary products, driving cross-sell revenue and increasing average order value.

---

Product detail pages are where purchase decisions happen. A customer is already looking at a specific product, which tells you a lot about what they want. This is the perfect moment to show them complementary items - a phone case when they are looking at a phone, a matching belt when they are browsing shoes, a lens kit when they are considering a camera. Done well, cross-selling on product pages increases average order value without feeling pushy.

In this guide, I will show you how to implement Recommendations AI on your product detail pages using the "Others You May Like" and "Frequently Bought Together" model types.

## Choosing the Right Model Type

For product detail pages, you have two primary model types:

- **Others You May Like**: Shows similar or alternative products based on the product being viewed and the user's history. Think "you might also consider these alternatives."
- **Frequently Bought Together**: Shows products that are commonly purchased alongside the viewed product. Think "customers who bought this also bought these."

Use both if you have the traffic to support them. "Others You May Like" works well near the top of the page, while "Frequently Bought Together" works well near the add-to-cart button.

## Setting Up the Models

Create both model types for your product pages.

```python
from google.cloud import retail_v2

def create_pdp_models(project_id):
    """Create recommendation models for the product detail page."""
    client = retail_v2.ModelServiceClient()
    parent = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog"
    )

    # Model 1: Others You May Like - alternatives and similar items
    similar_model = retail_v2.Model(
        display_name="PDP - Others You May Like",
        type_="others-you-may-like",
        optimization_objective="ctr",
        filtering_option=retail_v2.RecommendationsFilteringOption.RECOMMENDATIONS_FILTERING_ENABLED,
        periodic_tuning_state=retail_v2.Model.PeriodicTuningState.PERIODIC_TUNING_ENABLED,
    )

    similar_op = client.create_model(
        request=retail_v2.CreateModelRequest(
            parent=parent,
            model=similar_model,
            model_id="pdp-similar-items"
        )
    )
    print(f"Others You May Like model training started: {similar_op.operation.name}")

    # Model 2: Frequently Bought Together - complementary items
    fbt_model = retail_v2.Model(
        display_name="PDP - Frequently Bought Together",
        type_="frequently-bought-together",
        optimization_objective="cvr",  # Optimize for conversion
        filtering_option=retail_v2.RecommendationsFilteringOption.RECOMMENDATIONS_FILTERING_ENABLED,
        periodic_tuning_state=retail_v2.Model.PeriodicTuningState.PERIODIC_TUNING_ENABLED,
    )

    fbt_op = client.create_model(
        request=retail_v2.CreateModelRequest(
            parent=parent,
            model=fbt_model,
            model_id="pdp-bought-together"
        )
    )
    print(f"Frequently Bought Together model training started: {fbt_op.operation.name}")

    return similar_op, fbt_op

create_pdp_models("my-gcp-project")
```

## Creating Serving Configurations

Set up serving configs for each placement on the product page.

```python
from google.cloud import retail_v2

def create_pdp_serving_configs(project_id):
    """Create serving configurations for PDP recommendation widgets."""
    client = retail_v2.ServingConfigServiceClient()
    parent = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog"
    )

    # Serving config for "Similar Items" section
    similar_config = retail_v2.ServingConfig(
        display_name="PDP Similar Items",
        solution_types=[retail_v2.SolutionType.SOLUTION_TYPE_RECOMMENDATION],
        model_id="pdp-similar-items",
        diversity_level="medium-diversity",
        price_reranking_level="medium-price-reranking",
    )

    client.create_serving_config(
        request=retail_v2.CreateServingConfigRequest(
            parent=parent,
            serving_config=similar_config,
            serving_config_id="pdp-similar"
        )
    )

    # Serving config for "Frequently Bought Together" section
    fbt_config = retail_v2.ServingConfig(
        display_name="PDP Frequently Bought Together",
        solution_types=[retail_v2.SolutionType.SOLUTION_TYPE_RECOMMENDATION],
        model_id="pdp-bought-together",
        diversity_level="low-diversity",  # FBT should be focused, not diverse
    )

    client.create_serving_config(
        request=retail_v2.CreateServingConfigRequest(
            parent=parent,
            serving_config=fbt_config,
            serving_config_id="pdp-fbt"
        )
    )

    print("PDP serving configs created")

create_pdp_serving_configs("my-gcp-project")
```

## Building the PDP Recommendation API

Create an API endpoint that your frontend calls when a product page loads.

```python
from flask import Flask, request, jsonify
from google.cloud import retail_v2
import time

app = Flask(__name__)
predict_client = retail_v2.PredictionServiceClient()
PROJECT_ID = "my-gcp-project"

@app.route("/api/pdp/recommendations", methods=["GET"])
def pdp_recommendations():
    """Get cross-sell recommendations for a product detail page."""
    product_id = request.args.get("product_id")
    visitor_id = request.args.get("visitor_id")
    user_id = request.args.get("user_id")

    if not product_id or not visitor_id:
        return jsonify({"error": "product_id and visitor_id required"}), 400

    start_time = time.time()

    # Build the user event context with the viewed product
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

    results = {}

    # Fetch "Similar Items" recommendations
    try:
        similar_response = predict_client.predict(
            request=retail_v2.PredictRequest(
                placement=(
                    f"projects/{PROJECT_ID}/locations/global"
                    f"/catalogs/default_catalog"
                    f"/servingConfigs/pdp-similar"
                ),
                user_event=user_event,
                page_size=8,
                filter='availability: ANY("IN_STOCK")',
            )
        )
        results["similar_items"] = [
            {"product_id": r.id} for r in similar_response.results
        ]
    except Exception as e:
        results["similar_items"] = []
        print(f"Error fetching similar items: {e}")

    # Fetch "Frequently Bought Together" recommendations
    try:
        fbt_response = predict_client.predict(
            request=retail_v2.PredictRequest(
                placement=(
                    f"projects/{PROJECT_ID}/locations/global"
                    f"/catalogs/default_catalog"
                    f"/servingConfigs/pdp-fbt"
                ),
                user_event=user_event,
                page_size=4,
                filter='availability: ANY("IN_STOCK")',
            )
        )
        results["frequently_bought_together"] = [
            {"product_id": r.id} for r in fbt_response.results
        ]
    except Exception as e:
        results["frequently_bought_together"] = []
        print(f"Error fetching FBT: {e}")

    latency_ms = (time.time() - start_time) * 1000

    return jsonify({
        "product_id": product_id,
        "recommendations": results,
        "latency_ms": round(latency_ms, 1)
    })
```

## Frontend Integration

Here is how to call the API from your frontend and display the recommendations.

```javascript
// Fetch and render PDP recommendations
async function loadPDPRecommendations(productId) {
    const visitorId = getVisitorId(); // Your session/device ID function
    const userId = getCurrentUserId(); // null if not logged in

    // Build the API URL with query parameters
    let url = `/api/pdp/recommendations?product_id=${productId}&visitor_id=${visitorId}`;
    if (userId) {
        url += `&user_id=${userId}`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Render "Similar Items" section
        if (data.recommendations.similar_items.length > 0) {
            renderProductCarousel(
                'similar-items-container',
                data.recommendations.similar_items,
                'You May Also Like'
            );
        }

        // Render "Frequently Bought Together" section
        if (data.recommendations.frequently_bought_together.length > 0) {
            renderProductGrid(
                'fbt-container',
                data.recommendations.frequently_bought_together,
                'Frequently Bought Together'
            );
        }

        // Track impressions for analytics
        trackRecommendationImpressions(productId, data.recommendations);
    } catch (error) {
        console.error('Failed to load recommendations:', error);
    }
}
```

## Excluding the Current Product

Make sure the product being viewed does not appear in its own recommendations. Use a filter to exclude it.

```python
def get_similar_excluding_current(product_id, visitor_id, user_id=None):
    """Get similar items while excluding the currently viewed product."""
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

    # Filter out the current product and only show in-stock items
    filter_expr = f'availability: ANY("IN_STOCK") AND NOT id: ANY("{product_id}")'

    response = predict_client.predict(
        request=retail_v2.PredictRequest(
            placement=(
                f"projects/{PROJECT_ID}/locations/global"
                f"/catalogs/default_catalog/servingConfigs/pdp-similar"
            ),
            user_event=user_event,
            page_size=8,
            filter=filter_expr,
        )
    )

    return [r.id for r in response.results]
```

## Measuring Cross-Sell Impact

Track how PDP recommendations affect your key metrics.

```sql
-- Measure the add-to-cart rate from PDP recommendations
-- This tells you how effective cross-sell recommendations are
SELECT
  serving_config,
  COUNT(DISTINCT impression_id) as impressions,
  COUNT(DISTINCT click_id) as clicks,
  COUNT(DISTINCT atc_id) as add_to_carts,
  ROUND(SAFE_DIVIDE(COUNT(DISTINCT click_id),
    COUNT(DISTINCT impression_id)) * 100, 2) as ctr_pct,
  ROUND(SAFE_DIVIDE(COUNT(DISTINCT atc_id),
    COUNT(DISTINCT click_id)) * 100, 2) as click_to_cart_pct
FROM analytics.pdp_rec_events
WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND serving_config IN ('pdp-similar', 'pdp-fbt')
GROUP BY serving_config;
```

## Best Practices for PDP Cross-Selling

Keep these principles in mind:

- **Limit the count**: Show 4-8 similar items and 3-4 frequently bought together items. More than that dilutes attention.
- **Show prices**: Users need price context to make purchase decisions on recommended items.
- **Use clear section headers**: "Customers Also Bought" is clearer than "Related Products."
- **Place FBT near the add-to-cart button**: This is where the purchase intent is highest.
- **Lazy load recommendations**: Do not let recommendation API latency slow down your initial page load.

## Wrapping Up

Cross-selling on product detail pages is one of the highest-ROI applications of Recommendations AI. By combining "Others You May Like" for alternatives with "Frequently Bought Together" for complementary items, you give users more reasons to add items to their cart. The key is positioning the recommendations where purchase intent is highest, filtering out irrelevant or out-of-stock items, and continuously measuring the impact on add-to-cart rate and average order value. Start with one model type, measure its impact, then add the second once you have baseline numbers to compare against.
