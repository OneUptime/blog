# How to Implement Address Search and Geocoding with Azure Maps Search API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Maps, Search API, Geocoding, Reverse Geocoding, Address Search, Geospatial, REST API

Description: A practical guide to implementing address search, geocoding, and reverse geocoding using the Azure Maps Search API with code examples in JavaScript and Python.

---

Geocoding is the process of converting a human-readable address into geographic coordinates (latitude and longitude). Reverse geocoding does the opposite - it takes coordinates and returns the nearest address. These operations are fundamental to any location-based application, from delivery route planning to store locators to asset tracking dashboards. Azure Maps provides a Search API that handles geocoding, reverse geocoding, fuzzy search, and point-of-interest discovery in a single service.

This guide covers how to use the Azure Maps Search API for common geocoding tasks, with examples in both JavaScript (for browser-based apps) and Python (for server-side processing).

## Getting Started

You need an Azure Maps account with a subscription key. If you do not have one yet, create it with the Azure CLI.

```bash
az maps account create \
  --name my-maps-account \
  --resource-group maps-rg \
  --sku S1

# Retrieve the subscription key
az maps account keys list \
  --name my-maps-account \
  --resource-group maps-rg \
  --query primaryKey -o tsv
```

The Search API is a REST service. You can call it from any language that can make HTTP requests. The base URL is `https://atlas.microsoft.com/search`.

## Forward Geocoding: Address to Coordinates

The most common operation is turning an address into coordinates. The Search Address API does this.

```python
# geocode.py - Forward geocoding with Azure Maps Search API
import requests

AZURE_MAPS_KEY = "your-subscription-key"
BASE_URL = "https://atlas.microsoft.com/search/address/json"

def geocode_address(address: str) -> dict:
    """Convert an address string to geographic coordinates."""
    params = {
        "api-version": "1.0",
        "subscription-key": AZURE_MAPS_KEY,
        "query": address,
        "limit": 1  # Return only the best match
    }

    response = requests.get(BASE_URL, params=params)
    response.raise_for_status()
    data = response.json()

    if data["summary"]["numResults"] > 0:
        result = data["results"][0]
        return {
            "address": result["address"]["freeformAddress"],
            "latitude": result["position"]["lat"],
            "longitude": result["position"]["lon"],
            "confidence": result["score"],
            "type": result["type"]
        }
    return None

# Example usage
result = geocode_address("1 Microsoft Way, Redmond, WA 98052")
if result:
    print(f"Address: {result['address']}")
    print(f"Coordinates: {result['latitude']}, {result['longitude']}")
    print(f"Confidence: {result['confidence']}")
```

The API returns a confidence score that indicates how well the input matches the result. A score close to 1.0 means a very precise match. Lower scores may indicate the API had to guess or approximate.

## Reverse Geocoding: Coordinates to Address

When you have GPS coordinates and need a human-readable address, use the reverse search endpoint.

```python
# reverse_geocode.py - Reverse geocoding
import requests

AZURE_MAPS_KEY = "your-subscription-key"
BASE_URL = "https://atlas.microsoft.com/search/address/reverse/json"

def reverse_geocode(lat: float, lon: float) -> dict:
    """Convert geographic coordinates to a street address."""
    params = {
        "api-version": "1.0",
        "subscription-key": AZURE_MAPS_KEY,
        "query": f"{lat},{lon}"
    }

    response = requests.get(BASE_URL, params=params)
    response.raise_for_status()
    data = response.json()

    if data.get("addresses") and len(data["addresses"]) > 0:
        addr = data["addresses"][0]["address"]
        return {
            "streetAddress": addr.get("streetNameAndNumber", ""),
            "city": addr.get("municipality", ""),
            "state": addr.get("countrySubdivision", ""),
            "postalCode": addr.get("postalCode", ""),
            "country": addr.get("country", ""),
            "freeformAddress": addr.get("freeformAddress", "")
        }
    return None

# Example usage
result = reverse_geocode(47.6062, -122.3321)
if result:
    print(f"Address: {result['freeformAddress']}")
    print(f"City: {result['city']}, {result['state']}")
```

## Fuzzy Search: Flexible Address and POI Discovery

The fuzzy search endpoint is the most versatile. It handles partial addresses, business names, landmarks, and points of interest in a single query. This is what you want to use for search boxes where users can type anything.

```python
# fuzzy_search.py - Flexible search for addresses and points of interest
import requests

AZURE_MAPS_KEY = "your-subscription-key"
BASE_URL = "https://atlas.microsoft.com/search/fuzzy/json"

def fuzzy_search(query: str, lat: float = None, lon: float = None, radius: int = None) -> list:
    """Search for addresses, places, and points of interest.

    Optionally bias results toward a specific location and radius.
    """
    params = {
        "api-version": "1.0",
        "subscription-key": AZURE_MAPS_KEY,
        "query": query,
        "limit": 10
    }

    # Bias results toward a location if provided
    if lat and lon:
        params["lat"] = lat
        params["lon"] = lon
    if radius:
        params["radius"] = radius  # Radius in meters

    response = requests.get(BASE_URL, params=params)
    response.raise_for_status()
    data = response.json()

    results = []
    for item in data.get("results", []):
        results.append({
            "name": item.get("poi", {}).get("name", item["address"].get("freeformAddress", "")),
            "address": item["address"].get("freeformAddress", ""),
            "latitude": item["position"]["lat"],
            "longitude": item["position"]["lon"],
            "type": item["type"],
            "category": item.get("poi", {}).get("categories", []),
            "phone": item.get("poi", {}).get("phone", ""),
            "score": item.get("score", 0)
        })

    return results

# Search for coffee shops near Seattle center
results = fuzzy_search("coffee", lat=47.6062, lon=-122.3321, radius=5000)
for place in results:
    print(f"{place['name']} - {place['address']} (score: {place['score']:.2f})")
```

## Building a Search Autocomplete in JavaScript

For web applications, you want to provide search suggestions as the user types. Here is how to build an autocomplete using the Azure Maps SDK.

```javascript
// search-autocomplete.js - Search suggestions as the user types

// Throttle function to limit API calls during typing
function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func(...args);
        }
    };
}

// Search for address suggestions
async function searchSuggestions(query) {
    if (query.length < 3) return []; // Don't search for very short queries

    const url = new URL('https://atlas.microsoft.com/search/fuzzy/json');
    url.searchParams.set('api-version', '1.0');
    url.searchParams.set('subscription-key', 'YOUR_AZURE_MAPS_KEY');
    url.searchParams.set('query', query);
    url.searchParams.set('limit', '5');
    url.searchParams.set('typeahead', 'true'); // Enable typeahead mode for partial queries

    const response = await fetch(url);
    const data = await response.json();

    return data.results.map(function(result) {
        return {
            text: result.address.freeformAddress,
            position: result.position,
            type: result.type
        };
    });
}

// Wire up the search input
const searchInput = document.getElementById('search-input');
const suggestionsList = document.getElementById('suggestions');

// Throttled handler - search at most every 300ms
const handleInput = throttle(async function(event) {
    const query = event.target.value;
    const suggestions = await searchSuggestions(query);

    // Clear previous suggestions
    suggestionsList.innerHTML = '';

    // Display new suggestions
    suggestions.forEach(function(suggestion) {
        const li = document.createElement('li');
        li.textContent = suggestion.text;
        li.addEventListener('click', function() {
            // When user selects a suggestion, center the map on it
            searchInput.value = suggestion.text;
            suggestionsList.innerHTML = '';
            map.setCamera({
                center: [suggestion.position.lon, suggestion.position.lat],
                zoom: 15
            });
        });
        suggestionsList.appendChild(li);
    });
}, 300);

searchInput.addEventListener('input', handleInput);
```

## Batch Geocoding

If you need to geocode many addresses at once (for example, importing a CSV of customer addresses), use the batch search endpoint.

```python
# batch_geocode.py - Geocode multiple addresses in a single request
import requests
import json
import time

AZURE_MAPS_KEY = "your-subscription-key"
BATCH_URL = "https://atlas.microsoft.com/search/address/batch/json"

def batch_geocode(addresses: list) -> list:
    """Geocode up to 100 addresses in a single batch request."""
    # Build the batch request body
    batch_items = []
    for address in addresses:
        batch_items.append({
            "query": f"?query={address}&limit=1"
        })

    payload = {
        "batchItems": batch_items
    }

    params = {
        "api-version": "1.0",
        "subscription-key": AZURE_MAPS_KEY
    }

    response = requests.post(BATCH_URL, params=params, json=payload)

    # For large batches, the API returns 202 with a status URL
    if response.status_code == 202:
        status_url = response.headers["Location"]
        return poll_batch_result(status_url)

    # For small batches, results come back immediately
    response.raise_for_status()
    return parse_batch_results(response.json())

def poll_batch_result(status_url):
    """Poll for batch results until complete."""
    while True:
        response = requests.get(status_url, params={
            "subscription-key": AZURE_MAPS_KEY
        })
        if response.status_code == 200:
            return parse_batch_results(response.json())
        # Still processing, wait and retry
        time.sleep(2)

def parse_batch_results(data):
    """Parse batch response into a clean format."""
    results = []
    for item in data.get("batchItems", []):
        if item["statusCode"] == 200 and item["response"]["summary"]["numResults"] > 0:
            result = item["response"]["results"][0]
            results.append({
                "address": result["address"]["freeformAddress"],
                "latitude": result["position"]["lat"],
                "longitude": result["position"]["lon"]
            })
        else:
            results.append(None)  # Geocoding failed for this address
    return results

# Example usage
addresses = [
    "1 Microsoft Way, Redmond, WA",
    "350 5th Avenue, New York, NY",
    "1600 Pennsylvania Avenue NW, Washington, DC",
    "1 Apple Park Way, Cupertino, CA"
]

results = batch_geocode(addresses)
for address, result in zip(addresses, results):
    if result:
        print(f"{address} -> ({result['latitude']}, {result['longitude']})")
    else:
        print(f"{address} -> FAILED")
```

## Structured vs. Unstructured Search

The Search API supports both unstructured queries (a single string) and structured queries (separate fields for street, city, state, country). Structured queries produce more accurate results because the API does not have to guess which part of the string is the city vs. the state.

```python
# Structured search - more accurate for known address components
def structured_geocode(street: str, city: str, state: str, country: str = "US") -> dict:
    url = "https://atlas.microsoft.com/search/address/structured/json"
    params = {
        "api-version": "1.0",
        "subscription-key": AZURE_MAPS_KEY,
        "streetNumber": street.split()[0] if street else "",
        "streetName": " ".join(street.split()[1:]) if street else "",
        "municipality": city,
        "countrySubdivision": state,
        "countryCode": country,
        "limit": 1
    }

    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()

    if data["summary"]["numResults"] > 0:
        result = data["results"][0]
        return {
            "latitude": result["position"]["lat"],
            "longitude": result["position"]["lon"],
            "freeformAddress": result["address"]["freeformAddress"]
        }
    return None
```

## Error Handling and Rate Limits

The Azure Maps Search API has rate limits based on your pricing tier. S0 allows 50 queries per second, S1 allows 50 queries per second with higher overall throughput. Handle rate limiting gracefully.

```python
def geocode_with_retry(address: str, max_retries: int = 3) -> dict:
    """Geocode with retry logic for rate limiting."""
    for attempt in range(max_retries):
        response = requests.get(BASE_URL, params={
            "api-version": "1.0",
            "subscription-key": AZURE_MAPS_KEY,
            "query": address,
            "limit": 1
        })

        if response.status_code == 429:
            # Rate limited - wait and retry
            retry_after = int(response.headers.get("Retry-After", 1))
            print(f"Rate limited, waiting {retry_after}s (attempt {attempt + 1})")
            time.sleep(retry_after)
            continue

        response.raise_for_status()
        data = response.json()

        if data["summary"]["numResults"] > 0:
            result = data["results"][0]
            return {
                "latitude": result["position"]["lat"],
                "longitude": result["position"]["lon"]
            }
        return None

    raise Exception(f"Failed to geocode after {max_retries} attempts")
```

## Wrapping Up

The Azure Maps Search API is a solid geocoding solution that handles forward geocoding, reverse geocoding, fuzzy search, and batch processing through a consistent REST interface. For web applications, pair it with the Azure Maps Web SDK for autocomplete search experiences. For server-side batch processing, use the batch endpoint to geocode hundreds of addresses efficiently. The key decision is whether to use fuzzy search (great for user-facing search boxes) or structured search (better for programmatic geocoding of clean address data). Choose based on the quality of your input data and the tolerance for ambiguity in your use case.
