# How to Create a Recommended For You Personalized Model in Recommendations AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Recommendations AI, Personalization, Machine Learning, Retail API

Description: Learn how to create and configure a Recommended For You personalized recommendation model in Google Cloud Recommendations AI for your ecommerce platform.

---

The "Recommended For You" model is the flagship feature of Recommendations AI. It generates personalized product suggestions for each individual user based on their browsing history, purchase patterns, and behavior. Unlike simple "top sellers" or "trending" lists that show the same products to everyone, this model tailors its output to each user's unique preferences.

In this guide, I will walk through creating, configuring, and tuning a Recommended For You model from scratch.

## Prerequisites

Before creating a recommendation model, you need:

- A product catalog imported into the Retail API (see the catalog setup guide)
- At least 90 days of user event data (the more the better)
- A minimum of 100 unique users with purchase events
- The Retail API enabled in your project

These minimums ensure the model has enough data to learn meaningful patterns. Trying to train with too little data produces generic, unhelpful recommendations.

## Understanding Model Types

Recommendations AI offers several model types:

- **Recommended For You**: Personalized suggestions based on individual user behavior
- **Others You May Like**: Similar items based on a seed product
- **Frequently Bought Together**: Products commonly purchased together
- **Recently Viewed**: Products the user has recently interacted with

This guide focuses on the "Recommended For You" type, which is the most complex and powerful.

## Step 1: Create the Serving Configuration

A serving configuration (also called a placement) defines where recommendations will appear in your application.

```python
from google.cloud import retail_v2

def create_serving_config(project_id, serving_config_id, display_name):
    """Create a serving configuration for recommendations."""
    client = retail_v2.ServingConfigServiceClient()

    parent = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog"
    )

    serving_config = retail_v2.ServingConfig(
        display_name=display_name,
        solution_types=[retail_v2.SolutionType.SOLUTION_TYPE_RECOMMENDATION],
        model_id="",  # Will be linked after model training
    )

    request = retail_v2.CreateServingConfigRequest(
        parent=parent,
        serving_config=serving_config,
        serving_config_id=serving_config_id
    )

    result = client.create_serving_config(request=request)
    print(f"Serving config created: {result.name}")
    return result

# Create a serving config for the homepage recommendations
serving_config = create_serving_config(
    "my-gcp-project",
    "homepage-recs",
    "Homepage Recommended For You"
)
```

## Step 2: Create the Recommendation Model

Now create the actual model that will power your recommendations.

```python
from google.cloud import retail_v2

def create_recommendation_model(project_id, model_id, display_name):
    """Create a Recommended For You model."""
    client = retail_v2.ModelServiceClient()

    parent = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog"
    )

    # Configure the model
    model = retail_v2.Model(
        display_name=display_name,
        type_="recommended-for-you",
        optimization_objective="ctr",  # Optimize for click-through rate
        # Other options: "cvr" for conversion rate

        # Filtering allows/disallows certain recommendation patterns
        filtering_option=retail_v2.RecommendationsFilteringOption.RECOMMENDATIONS_FILTERING_ENABLED,

        # Periodic tuning keeps the model fresh
        periodic_tuning_state=retail_v2.Model.PeriodicTuningState.PERIODIC_TUNING_ENABLED,
    )

    request = retail_v2.CreateModelRequest(
        parent=parent,
        model=model,
        model_id=model_id
    )

    # Model creation starts the initial training
    operation = client.create_model(request=request)
    print(f"Model training started. This typically takes 1-3 days.")
    print(f"Operation: {operation.operation.name}")

    return operation

# Create the model
operation = create_recommendation_model(
    "my-gcp-project",
    "homepage-rec-model",
    "Homepage Recommended For You Model"
)
```

## Step 3: Monitor Training Progress

Model training takes time. Here is how to check on its progress.

```python
from google.cloud import retail_v2

def check_model_status(project_id, model_id):
    """Check the current status of a recommendation model."""
    client = retail_v2.ModelServiceClient()

    model_name = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog/models/{model_id}"
    )

    model = client.get_model(name=model_name)

    print(f"Model: {model.display_name}")
    print(f"Type: {model.type_}")
    print(f"Training state: {model.training_state}")
    print(f"Serving state: {model.serving_state}")
    print(f"Optimization objective: {model.optimization_objective}")
    print(f"Last tune time: {model.last_tune_time}")
    print(f"Tuning operation: {model.tuning_operation}")

    # Data state tells you about event quality
    print(f"\nData state: {model.data_state}")

    return model

model = check_model_status("my-gcp-project", "homepage-rec-model")
```

## Step 4: Link the Model to a Serving Configuration

Once the model is trained, connect it to your serving configuration so you can request recommendations.

```python
from google.cloud import retail_v2
from google.protobuf import field_mask_pb2

def link_model_to_serving_config(project_id, serving_config_id, model_id):
    """Link a trained model to a serving configuration."""
    client = retail_v2.ServingConfigServiceClient()

    serving_config_name = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog"
        f"/servingConfigs/{serving_config_id}"
    )

    serving_config = retail_v2.ServingConfig(
        name=serving_config_name,
        model_id=model_id
    )

    update_mask = field_mask_pb2.FieldMask(paths=["model_id"])

    request = retail_v2.UpdateServingConfigRequest(
        serving_config=serving_config,
        update_mask=update_mask
    )

    result = client.update_serving_config(request=request)
    print(f"Model {model_id} linked to serving config {serving_config_id}")
    return result

link_model_to_serving_config(
    "my-gcp-project",
    "homepage-recs",
    "homepage-rec-model"
)
```

## Step 5: Configure Diversity and Filtering

Fine-tune how recommendations are generated with diversity settings and business rules.

```python
from google.cloud import retail_v2
from google.protobuf import field_mask_pb2

def configure_serving_rules(project_id, serving_config_id):
    """Configure diversity and filtering rules for recommendations."""
    client = retail_v2.ServingConfigServiceClient()

    serving_config_name = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog"
        f"/servingConfigs/{serving_config_id}"
    )

    serving_config = retail_v2.ServingConfig(
        name=serving_config_name,

        # Diversity settings prevent showing too many similar items
        diversity_level="high-diversity",
        # Options: "no-diversity", "low-diversity",
        #          "medium-diversity", "high-diversity", "auto-diversity"

        # Price reranking boosts products in the user's preferred price range
        price_reranking_level="low-price-reranking",
        # Options: "no-price-reranking", "low-price-reranking",
        #          "medium-price-reranking", "high-price-reranking"
    )

    update_mask = field_mask_pb2.FieldMask(
        paths=["diversity_level", "price_reranking_level"]
    )

    request = retail_v2.UpdateServingConfigRequest(
        serving_config=serving_config,
        update_mask=update_mask
    )

    result = client.update_serving_config(request=request)
    print(f"Serving config updated with diversity and pricing rules")
    return result

configure_serving_rules("my-gcp-project", "homepage-recs")
```

## Step 6: Request Recommendations

With the model trained and linked, you can now request personalized recommendations.

```python
from google.cloud import retail_v2

def get_recommendations(project_id, serving_config_id,
                         visitor_id, user_id=None, page_size=10):
    """Get personalized recommendations for a user."""
    client = retail_v2.PredictionServiceClient()

    placement = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog"
        f"/servingConfigs/{serving_config_id}"
    )

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
        # Optional: filter recommendations
        filter='availability: ANY("IN_STOCK")',
    )

    response = client.predict(request=request)

    print(f"Got {len(response.results)} recommendations:")
    for i, result in enumerate(response.results):
        product_id = result.id
        metadata = dict(result.metadata) if result.metadata else {}
        print(f"  {i+1}. Product: {product_id}")
        if "score" in metadata:
            print(f"     Score: {metadata['score']}")

    return response

# Get recommendations for a specific user
recs = get_recommendations(
    "my-gcp-project",
    "homepage-recs",
    visitor_id="session-abc123",
    user_id="user-789",
    page_size=12
)
```

## Optimization Objectives

Choose the right optimization objective for your business goal:

- **ctr (Click-Through Rate)**: Maximizes the chance users will click on recommended products. Best for driving engagement and product discovery.
- **cvr (Conversion Rate)**: Maximizes the chance users will purchase recommended products. Best for driving revenue directly.

Start with CTR optimization if you are unsure. It tends to produce more diverse recommendations. Switch to CVR optimization when you want to maximize direct sales impact.

## Wrapping Up

Creating a Recommended For You model involves several steps - setting up serving configurations, creating the model, waiting for training, and linking everything together. The initial training period (1-3 days) requires patience, but once the model is ready, it delivers personalized recommendations that improve as more user events flow in. Tune diversity settings and optimization objectives based on your business goals, and remember that the model automatically retrains periodically to stay current with changing user preferences and product inventory.
