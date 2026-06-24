# How to Use Gemini Grounding with Google Maps for Location-Aware AI Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Gemini, Vertex AI, Google Maps, Location AI

Description: Learn how to use Gemini grounding with Google Maps on Vertex AI to build location-aware AI applications that provide accurate place data and directions.

---

Grounding with Google Maps gives Gemini access to current geospatial data - places, business information, ratings, hours, and geographic context. When a user asks about restaurants nearby or local points of interest, the model can pull actual location data instead of guessing from its training data.

I have been using this feature to build location-aware assistants for travel planning and local business discovery. The accuracy improvement over ungrounded responses is substantial, especially for up-to-date business hours and ratings. Let me show you how to integrate it.

## How Maps Grounding Works

When you enable Google Maps grounding, Gemini can query the Google Maps platform during response generation. It can look up places, find businesses by type, check hours and ratings, and understand geographic relationships. The responses include proper citations and source metadata. Routing and search-along-route capabilities are available as restricted preview features.

This is different from the Google Search grounding feature. Maps grounding specifically uses the Google Maps data platform, which has richer structured data about physical locations.

## Enabling Maps Grounding

Set up Maps grounding as a tool in your Gemini model configuration. Install the current Google Gen AI SDK first:

```bash
pip install --upgrade google-genai
```

```python
from google import genai
from google.genai import types

# Initialize Vertex AI

client = genai.Client(
    vertexai=True,
    project="your-project-id",
    location="global",
    http_options=types.HttpOptions(api_version="v1"),
)

# Create the Google Maps grounding tool
maps_tool = types.Tool(
    google_maps=types.GoogleMaps(
        enable_widget=False
    )
)

# Create the generation config with Maps grounding
maps_config = types.GenerateContentConfig(
    tools=[maps_tool],
    system_instruction=(
        "You are a location-aware assistant. When users ask about places, "
        "local businesses, or geographic context, use your grounding tools to "
        "provide accurate, current information. Always include addresses "
        "and relevant details like hours and ratings when available."
    )
)

# Ask a location-based question
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="What are the best coffee shops near the Googleplex in Mountain View?",
    config=maps_config,
)

print(response.text)
```

## Extracting Location Data

When the model uses Maps grounding, the response includes Google Maps source information in the grounding metadata.

```python
def extract_location_data(response):
    """Extract location information from a grounded response."""
    result = {
        "text": response.text,
        "places": [],
        "sources": []
    }

    candidate = response.candidates[0]

    if candidate.grounding_metadata:
        metadata = candidate.grounding_metadata

        # Extract grounding chunks (sources)
        if metadata.grounding_chunks:
            for chunk in metadata.grounding_chunks:
                if chunk.maps:
                    result["sources"].append({
                        "title": chunk.maps.title,
                        "uri": chunk.maps.uri,
                        "place_id": chunk.maps.place_id,
                    })

    return result

# Query and extract data
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=(
        "Find Italian restaurants in San Francisco with outdoor seating. "
        "Include ratings and price range."
    ),
    config=maps_config,
)

data = extract_location_data(response)
print(f"Response: {data['text']}")
print(f"\nSources: {len(data['sources'])}")
for source in data["sources"]:
    print(f"  - {source['title']}: {source['uri']}")
```

## Building a Travel Planning Assistant

Combine Maps grounding with conversational abilities to create a travel planner.

```python
class TravelPlanningAssistant:
    """A travel planning assistant with Maps grounding."""

    def __init__(self):
        config = types.GenerateContentConfig(
            tools=[maps_tool],
            system_instruction="""You are an experienced travel planning assistant.

When helping with travel plans:
- Suggest specific places with accurate names and addresses
- Consider travel time between locations
- Group nearby attractions together
- Include practical details: hours, pricing, booking requirements
- Mention seasonal considerations
- Suggest alternatives for different budgets
- Always verify current information through your tools
"""
        )
        self.chat = client.chats.create(
            model="gemini-2.5-flash",
            config=config,
        )

    def plan(self, message):
        """Send a planning message and get a response."""
        response = self.chat.send_message(message)
        return response.text

# Usage
assistant = TravelPlanningAssistant()

# Start planning
print(assistant.plan(
    "I am visiting Tokyo for 5 days in April. "
    "I love food, history, and nature. Help me plan an itinerary."
))

# Follow up
print(assistant.plan(
    "Can you suggest specific restaurants for each day? "
    "I want a mix of sushi, ramen, and izakaya experiences."
))

# Get practical details
print(assistant.plan(
    "What is the best way to get from Shinjuku to the Meiji Shrine?"
))
```

## Local Business Discovery

Build a local business finder that provides accurate, current information.

```python
def find_local_businesses(query, location_context=""):
    """Find local businesses using Maps grounding."""
    prompt = query
    if location_context:
        prompt = f"{query} (near {location_context})"

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=maps_config,
    )

    return {
        "results": response.text,
        "grounded": bool(
            response.candidates[0].grounding_metadata
            and response.candidates[0].grounding_metadata.grounding_chunks
        )
    }

# Find businesses
results = find_local_businesses(
    "Best rated auto repair shops",
    location_context="downtown Portland, Oregon"
)
print(results["results"])
print(f"Grounded: {results['grounded']}")
```

## Directions and Distance Queries

Ask for directions and, if your project has access to the restricted preview Routing tool, the model can use Maps data to provide route information.

```python
def get_directions(origin, destination, mode="driving"):
    """Get directions between two locations."""
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=(
            f"How do I get from {origin} to {destination} by {mode}? "
            f"Include estimated travel time, distance, and key route details."
        ),
        config=maps_config,
    )
    return response.text

# Get directions
directions = get_directions(
    "San Francisco Airport",
    "Fisherman's Wharf, San Francisco",
    mode="public transit"
)
print(directions)
```

## Building a Location-Aware Chatbot

Create a chatbot that understands the user's location context and provides relevant recommendations.

```python
class LocationAwareChatbot:
    """Chatbot that uses location context for recommendations."""

    def __init__(self):
        config = types.GenerateContentConfig(
            tools=[maps_tool],
            system_instruction=(
                "You are a helpful local guide. Use location data to provide "
                "accurate recommendations. When users mention a city or area, "
                "remember that context for future questions in the conversation."
            )
        )
        self.chat = client.chats.create(
            model="gemini-2.5-flash",
            config=config,
        )
        self.current_location = None

    def set_location(self, location):
        """Set the user's current location context."""
        self.current_location = location
        response = self.chat.send_message(
            f"I am currently in {location}. Keep this in mind for my questions."
        )
        return response.text

    def ask(self, question):
        """Ask a location-aware question."""
        if self.current_location and self.current_location.lower() not in question.lower():
            question = f"{question} (I am in {self.current_location})"
        response = self.chat.send_message(question)
        return response.text

# Usage
bot = LocationAwareChatbot()
bot.set_location("Austin, Texas")

print(bot.ask("Where can I get good barbecue?"))
print(bot.ask("What about vegetarian options nearby?"))
print(bot.ask("Is there a nice park within walking distance?"))
```

## Combining Maps with Other Data Sources

For richer applications, combine Maps grounding with your own business data.

```python
# Define a custom tool for your own business database
check_availability = types.FunctionDeclaration(
    name="check_availability",
    description="Check availability at a specific restaurant for a reservation.",
    parameters_json_schema={
        "type": "object",
        "properties": {
            "restaurant_name": {"type": "string"},
            "date": {"type": "string"},
            "party_size": {"type": "integer"},
            "time": {"type": "string"}
        },
        "required": ["restaurant_name", "date", "party_size"]
    }
)

custom_tool = types.Tool(function_declarations=[check_availability])
maps_grounding = types.Tool(
    google_maps=types.GoogleMaps(enable_widget=False)
)

# Generation config has both Maps and custom tools
combined_config = types.GenerateContentConfig(
    tools=[maps_grounding, custom_tool],
    system_instruction=(
        "You help users find and book restaurants. Use Maps to find places "
        "and the availability checker to see if reservations are open."
    )
)
```

## Handling Location Ambiguity

Location names can be ambiguous. "Portland" could be in Oregon or Maine. Handle this gracefully.

```python
def location_query_with_disambiguation(query):
    """Handle potentially ambiguous location queries."""
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=(
            f"{query}\n\n"
            "If the location mentioned is ambiguous (could refer to multiple places), "
            "ask for clarification. Otherwise, provide the information requested."
        ),
        config=maps_config,
    )
    return response.text

# Ambiguous query
result = location_query_with_disambiguation(
    "What are the best seafood restaurants in Portland?"
)
print(result)
```

## Caching Location Results

For frequently requested locations, cache the results to reduce API calls and latency.

```python
import hashlib
from datetime import datetime, timedelta

class LocationCache:
    """Simple cache for location query results."""

    def __init__(self, ttl_minutes=60):
        self.cache = {}
        self.ttl = timedelta(minutes=ttl_minutes)

    def get(self, query):
        """Get a cached result if available and fresh."""
        key = hashlib.md5(query.lower().encode()).hexdigest()
        if key in self.cache:
            entry = self.cache[key]
            if datetime.utcnow() - entry["timestamp"] < self.ttl:
                return entry["result"]
            else:
                del self.cache[key]
        return None

    def set(self, query, result):
        """Cache a query result."""
        key = hashlib.md5(query.lower().encode()).hexdigest()
        self.cache[key] = {
            "result": result,
            "timestamp": datetime.utcnow()
        }

# Usage
cache = LocationCache(ttl_minutes=30)

def cached_location_query(query):
    """Query with caching."""
    cached = cache.get(query)
    if cached:
        return cached

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=query,
        config=maps_config,
    )
    result = response.text
    cache.set(query, result)
    return result
```

## Wrapping Up

Gemini grounding with Google Maps turns your AI applications into location-aware assistants that provide accurate, current place data. Whether you are building a travel planner, a local business finder, or a location-aware assistant, Maps grounding gives the model Google Maps source data that it can reason about naturally. Start with simple location queries, build up to conversational travel planning, and add your own business data for a complete solution. Monitor your location service's response quality and latency with tools like OneUptime to maintain a great user experience.
