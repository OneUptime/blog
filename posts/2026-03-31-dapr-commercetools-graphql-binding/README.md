# How to Use Dapr commercetools GraphQL Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Commercetools, GraphQL, Binding, E-Commerce

Description: Learn how to configure and use the Dapr commercetools output binding to query and mutate your commercetools store data via GraphQL from microservices.

---

## What Is the Dapr commercetools Binding?

The Dapr commercetools binding allows microservices to interact with a commercetools e-commerce platform using GraphQL queries and mutations. Instead of managing OAuth2 token refresh and HTTP client setup yourself, Dapr handles authentication and request execution through a simple binding interface.

## Setting Up the commercetools Binding Component

You need a commercetools project with API client credentials. The binding uses the commercetools OAuth2 client credentials flow.

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: commercetools
  namespace: default
spec:
  type: bindings.commercetools
  version: v1
  metadata:
    - name: region
      value: "us-central1"
    - name: provider
      value: "gcp"
    - name: projectKey
      value: "my-ecommerce-project"
    - name: clientID
      value: "your-client-id"
    - name: clientSecret
      secretKeyRef:
        name: ct-secrets
        key: clientSecret
    - name: scopes
      value: "manage_products:my-ecommerce-project view_orders:my-ecommerce-project"
```

Store the client secret in a Kubernetes secret:

```bash
kubectl create secret generic ct-secrets \
  --from-literal=clientSecret=your-secret-here
```

## Querying Products via GraphQL

Use the `create` operation to run a GraphQL query:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function getProductById(productId) {
  const query = `
    query GetProduct($id: String!) {
      product(id: $id) {
        id
        masterData {
          current {
            name(locale: "en-US")
            slug(locale: "en-US")
            masterVariant {
              sku
              prices {
                value {
                  centAmount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await client.binding.send("commercetools", "create", {
    commercetoolsAPI: "GraphQLQuery",
    query,
    variables: { id: productId },
  });

  return result;
}
```

## Creating an Order via GraphQL Mutation

```javascript
async function createOrder(cartId, cartVersion) {
  const mutation = `
    mutation CreateOrder($cartId: String!, $version: Long!) {
      createOrderFromCart(
        draft: {
          id: $cartId
          version: $version
        }
      ) {
        id
        orderNumber
        orderState
        totalPrice {
          centAmount
          currencyCode
        }
      }
    }
  `;

  const result = await client.binding.send("commercetools", "create", {
    commercetoolsAPI: "GraphQLQuery",
    query: mutation,
    variables: { cartId, version: cartVersion },
  });

  console.log("Order created:", result.createOrderFromCart.id);
  return result;
}
```

## Updating Product Inventory

```javascript
async function updateProductStock(productId, quantity) {
  const mutation = `
    mutation UpdateStock($id: String!, $version: Long!, $qty: Json!) {
      updateProduct(
        id: $id
        version: $version
        actions: [{
          setAttributeInAllVariants: {
            name: "stock"
            value: $qty
          }
        }]
      ) {
        id
        version
      }
    }
  `;

  return await client.binding.send("commercetools", "create", {
    commercetoolsAPI: "GraphQLQuery",
    query: mutation,
    variables: { id: productId, version: 1, qty: quantity },
  });
}
```

## Handling Errors

The binding returns GraphQL errors in the response body:

```javascript
async function safeQuery(graphqlPayload) {
  try {
    const result = await client.binding.send(
      "commercetools",
      "create",
      graphqlPayload
    );
    if (result.errors && result.errors.length > 0) {
      console.error("GraphQL errors:", result.errors);
      throw new Error(result.errors[0].message);
    }
    return result.data;
  } catch (err) {
    console.error("Binding error:", err.message);
    throw err;
  }
}
```

## Summary

The Dapr commercetools binding abstracts OAuth2 authentication and HTTP management when working with the commercetools GraphQL API. By defining a single component YAML with your project credentials, you can execute any GraphQL query or mutation from your microservices using the Dapr SDK, keeping your application code focused on business logic rather than API client setup.
