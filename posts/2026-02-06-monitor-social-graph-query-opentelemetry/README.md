# How to Monitor Social Graph Query Performance (Friend Suggestions, Connection Degrees) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Social Graph, Graph Database, Friend Suggestions

Description: Monitor social graph query performance for friend suggestions and connection degree calculations using OpenTelemetry distributed tracing.

Social graph queries power some of the most important features on a platform: friend suggestions, mutual connection counts, "people you may know", and degrees of separation. These queries hit a graph database that can hold billions of edges, and performance varies wildly depending on the user's network size and graph density. OpenTelemetry helps you understand which queries are slow and why.

## Tracer and Meter Setup

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("social.graph")
meter = metrics.get_meter("social.graph")
```

## Tracing Friend Suggestion Generation

Friend suggestions typically involve finding friends of friends who are not already connected to the user, scoring them by mutual connections, and filtering by various signals.

```python
def generate_friend_suggestions(user_id: str, limit: int = 20):
    with tracer.start_as_current_span("graph.friend_suggestions") as span:
        span.set_attribute("user.id", user_id)
        span.set_attribute("suggestions.limit", limit)

        # Step 1: Get the user's current connections
        with tracer.start_as_current_span("graph.fetch_connections") as conn_span:
            connections = get_user_connections(user_id)
            conn_span.set_attribute("connections.count", len(connections))
            conn_span.set_attribute("graph.db", "neo4j")

        # Step 2: Find friends-of-friends (2nd degree connections)
        with tracer.start_as_current_span("graph.find_fof") as fof_span:
            fof_query = """
                MATCH (u:User {id: $user_id})-[:FOLLOWS]->(friend)-[:FOLLOWS]->(fof:User)
                WHERE NOT (u)-[:FOLLOWS]->(fof) AND fof.id <> $user_id
                RETURN fof.id, COUNT(friend) as mutual_count
                ORDER BY mutual_count DESC
                LIMIT $limit
            """
            fof_results = execute_graph_query(fof_query, {
                "user_id": user_id, "limit": limit * 3
            })
            fof_span.set_attribute("fof.candidates_found", len(fof_results))
            fof_span.set_attribute("graph.query_type", "friends_of_friends")

        # Step 3: Enrich candidates with scoring signals
        with tracer.start_as_current_span("graph.score_candidates") as score_span:
            scored_candidates = []
            for candidate in fof_results:
                score = compute_suggestion_score(
                    user_id, candidate["fof_id"], candidate["mutual_count"]
                )
                scored_candidates.append({
                    "user_id": candidate["fof_id"],
                    "mutual_count": candidate["mutual_count"],
                    "score": score
                })
            score_span.set_attribute("scoring.candidates_scored", len(scored_candidates))

        # Step 4: Apply filtering rules
        with tracer.start_as_current_span("graph.filter_suggestions") as filter_span:
            filtered = apply_suggestion_filters(user_id, scored_candidates)
            filter_span.set_attribute("filter.input_count", len(scored_candidates))
            filter_span.set_attribute("filter.output_count", len(filtered))
            filter_span.set_attribute("filter.removed_blocked", filtered.blocked_removed)
            filter_span.set_attribute("filter.removed_dismissed", filtered.dismissed_removed)

        final_suggestions = filtered.candidates[:limit]
        span.set_attribute("suggestions.returned", len(final_suggestions))
        return final_suggestions
```

## Tracing Connection Degree Queries

Calculating the degree of connection between two users (1st, 2nd, 3rd degree, or no connection) requires a breadth-first search through the graph. This can be expensive for loosely connected users.

```python
def get_connection_degree(user_a: str, user_b: str, max_depth: int = 3):
    with tracer.start_as_current_span("graph.connection_degree") as span:
        span.set_attribute("user.a", user_a)
        span.set_attribute("user.b", user_b)
        span.set_attribute("search.max_depth", max_depth)

        # Check if they are directly connected (1st degree)
        with tracer.start_as_current_span("graph.check_direct") as direct_span:
            direct = check_direct_connection(user_a, user_b)
            direct_span.set_attribute("connection.direct", direct)

            if direct:
                span.set_attribute("connection.degree", 1)
                return 1

        # Run shortest path query up to max_depth
        with tracer.start_as_current_span("graph.shortest_path") as path_span:
            path_query = """
                MATCH path = shortestPath(
                    (a:User {id: $user_a})-[:FOLLOWS*..%d]-(b:User {id: $user_b})
                )
                RETURN length(path) as degree, nodes(path) as path_nodes
            """ % max_depth

            result = execute_graph_query(path_query, {
                "user_a": user_a, "user_b": user_b
            })
            path_span.set_attribute("graph.query_type", "shortest_path")
            path_span.set_attribute("graph.nodes_traversed", result.nodes_traversed)

            if result.found:
                path_span.set_attribute("connection.degree", result.degree)
                path_span.set_attribute("connection.path_length", result.degree)
            else:
                path_span.set_attribute("connection.degree", -1)
                path_span.add_event("no_connection_found", {
                    "max_depth_searched": max_depth
                })

        span.set_attribute("connection.degree", result.degree if result.found else -1)
        return result.degree if result.found else -1
```

## Tracing Mutual Connection Queries

```python
def get_mutual_connections(user_a: str, user_b: str):
    with tracer.start_as_current_span("graph.mutual_connections") as span:
        span.set_attribute("user.a", user_a)
        span.set_attribute("user.b", user_b)

        mutual_query = """
            MATCH (a:User {id: $user_a})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(b:User {id: $user_b})
            RETURN mutual.id, mutual.name
        """

        with tracer.start_as_current_span("graph.execute_mutual_query") as query_span:
            result = execute_graph_query(mutual_query, {
                "user_a": user_a, "user_b": user_b
            })
            query_span.set_attribute("graph.query_type", "mutual_connections")
            query_span.set_attribute("mutual.count", len(result.records))
            query_span.set_attribute("graph.execution_time_ms", result.execution_time_ms)

        span.set_attribute("mutual.count", len(result.records))
        return result.records
```

## Graph Query Metrics

```python
graph_query_latency = meter.create_histogram(
    "graph.query.latency_ms",
    description="Graph database query latency",
    unit="ms"
)

graph_query_count = meter.create_counter(
    "graph.queries.total",
    description="Total graph queries by type"
)

suggestion_quality = meter.create_histogram(
    "graph.suggestions.mutual_count",
    description="Distribution of mutual connection counts in suggestions"
)

graph_traversal_depth = meter.create_histogram(
    "graph.traversal.depth",
    description="How deep the graph traversal went"
)
```

## What You Gain

Social graph queries are among the most variable-latency operations in a social platform. A user with 50 connections gets fast friend suggestions; a user with 5,000 connections might hit a timeout. With OpenTelemetry tracing each query, you can identify the patterns: which query types are slowest, which users trigger expensive traversals, and whether your caching layer is effective. This data helps you decide when to add caching, precompute suggestions, or set query timeouts to protect the database.
