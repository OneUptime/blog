# How to Use Gemini Grounding with Google Maps for Location-Aware AI Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Gemini, Vertex AI, Google Maps, Location AI

Description: Learn how to use Gemini grounding with Google Maps on Vertex AI to build location-aware AI applications that provide accurate place data and directions.

---

Grounding with Google Maps gives Gemini access to real-time location data - places, directions, business information, and geographic context. When a user asks about restaurants nearby or how to get somewhere, the model can pull actual location data instead of guessing from its training data.

I have been using this feature to build location-aware assistants for travel planning and local business discovery. The accuracy improvement over ungrounded responses is substantial, especially for up-to-date business hours and ratings. Let me show you how to integrate it.

## How Maps Grounding Works

When you enable Google Maps grounding, Gemini can query the Google Maps platform during response generation. It can look up places, get directions, find businesses by type, check hours and ratings, and understand geographic relationships. The responses include proper citations and location data.

This is different from the Google Search grounding feature. Maps grounding specifically uses the Google Maps data platform, which has richer structured data about physical locations.

## Enabling Maps Grounding

Set up Maps grounding as a tool in your Gemini model configuration.

```python
import vertexai
from vertexai.generative_models import (
    GenerativeModel,
    Tool,
    grounding,
)

# Initialize Vertex AI
vertexai.init(project="your-project-id", location="us-central1")

# Create the Google Maps grounding tool
maps_tool = Tool.from_google_search_retrieval(
    grounding.GoogleSearchRetrieval(
        # Maps grounding is configured through the search retrieval tool
        # with location-specific queries handled automatically
    )
)

# Create the model with Maps grounding
model = GenerativeModel(
    "gemini-2.0-flash",
    tools=[maps_tool],
    system_instruction=(
        "You are a location-aware assistant. When users ask about places, "
        "directions, or local businesses, use your grounding tools to "
        "provide accurate, current information. Always include addresses "
        "and relevant details like hours and ratings when available."
    )
)

# Ask a location-based question
response = model.generate_content(
    "What are the best coffee shops near the Googleplex in Mountain View?"
)

print(response.text)
```

## Extracting Location Data

When the model uses Maps grounding, the response includes structured location information in the grounding metadata.

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
                if chunk.web:
                    result["sources"].append({
                        "title": chunk.web.title,
                        "uri": chunk.web.uri
                    })

    return result

# Query and extract data
response = model.generate_content(
    "Find Italian restaurants in San Francisco with outdoor seating. "
    "Include ratings and price range."
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
        maps_grounding = Tool.from_google_search_retrieval(
            grounding.GoogleSearchRetrieval()
        )

        self.model = GenerativeModel(
            "gemini-2.0-flash",
            tools=[maps_grounding],
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
        self.chat = self.model.start_chat()

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

    response = model.generate_content(prompt)

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

Ask for directions and the model uses Maps data to provide accurate routing information.

```python
def get_directions(origin, destination, mode="driving"):
    """Get directions between two locations."""
    response = model.generate_content(
        f"How do I get from {origin} to {destination} by {mode}? "
        f"Include estimated travel time, distance, and key route details."
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
        maps_grounding = Tool.from_google_search_retrieval(
            grounding.GoogleSearchRetrieval()
        )

        self.model = GenerativeModel(
            "gemini-2.0-flash",
            tools=[maps_grounding],
            system_instruction=(
                "You are a helpful local guide. Use location data to provide "
                "accurate recommendations. When users mention a city or area, "
                "remember that context for future questions in the conversation."
            )
        )
        self.chat = self.model.start_chat()
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
from vertexai.generative_models import FunctionDeclaration

# Define a custom tool for your own business database
check_availability = FunctionDeclaration(
    name="check_availability",
    description="Check availability at a specific restaurant for a reservation.",
    parameters={
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

custom_tool = Tool(function_declarations=[check_availability])
maps_grounding = Tool.from_google_search_retrieval(
    grounding.GoogleSearchRetrieval()
)

# Model has both Maps and custom tools
combined_model = GenerativeModel(
    "gemini-2.0-flash",
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
    response = model.generate_content(
        f"{query}\n\n"
        "If the location mentioned is ambiguous (could refer to multiple places), "
        "ask for clarification. Otherwise, provide the information requested."
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

    response = model.generate_content(query)
    result = response.text
    cache.set(query, result)
    return result
```

## Wrapping Up

Gemini grounding with Google Maps turns your AI applications into location-aware assistants that provide accurate, real-time place data. Whether you are building a travel planner, a local business finder, or a directions service, Maps grounding gives you structured location data that the model can reason about naturally. Start with simple location queries, build up to conversational travel planning, and add your own business data for a complete solution. Monitor your location service's response quality and latency with tools like OneUptime to maintain a great user experience.
