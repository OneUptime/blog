# How to Use Dapr for Media and Streaming Platforms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Media, Streaming, Microservice, Event-Driven

Description: Build media and video streaming platform services with Dapr for content ingestion, transcoding workflows, recommendation engines, and viewer analytics.

---

Media streaming platforms handle content at massive scale: video ingestion, multi-bitrate transcoding, CDN delivery, personalized recommendations, and real-time viewer analytics. Dapr's workflow engine manages long-running transcoding pipelines, pub/sub distributes content events, and actor-based user sessions track viewing state.

## Media Platform Architecture with Dapr

```text
Content Upload -> Ingestion Service (Dapr) -> Transcoding Workflow (Dapr)
                                           -> CDN Purge Service (Dapr)
                                           -> Catalog Service (Dapr)
                                           -> Recommendation Service (Dapr)
                                           -> Analytics Service (Dapr)
```

## Content Ingestion and Transcoding Workflow

```python
# transcoding_service/workflows/transcode_workflow.py
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext, when_all

wfr = WorkflowRuntime()

@wfr.workflow(name='transcode_workflow')
def transcode_workflow(ctx: DaprWorkflowContext, content: dict):
    content_id = content['content_id']

    # Step 1: Validate uploaded content
    validation = yield ctx.call_activity(validate_content, input=content)
    if not validation['valid']:
        yield ctx.call_activity(mark_content_failed, input={
            'content_id': content_id, 'reason': validation['reason']})
        return {'status': 'failed', 'reason': validation['reason']}

    # Step 2: Generate thumbnails
    yield ctx.call_activity(generate_thumbnails, input=content)

    # Step 3: Transcode to multiple bitrates (fan-out)
    transcode_tasks = []
    for profile in ['480p', '720p', '1080p', '4k']:
        task = ctx.call_activity(transcode_to_profile, input={
            **content, 'profile': profile
        })
        transcode_tasks.append(task)

    # Wait for all transcoding tasks
    results = yield when_all(transcode_tasks)

    failed_profiles = [r for r in results if not r.get('success')]
    if failed_profiles:
        yield ctx.call_activity(notify_transcode_partial_failure, input={
            'content_id': content_id,
            'failed': [r['profile'] for r in failed_profiles]
        })

    # Step 4: Upload to CDN
    cdn_result = yield ctx.call_activity(upload_to_cdn, input={
        'content_id': content_id,
        'profiles': [r['profile'] for r in results if r.get('success')]
    })

    # Step 5: Update catalog
    yield ctx.call_activity(update_content_catalog, input={
        'content_id': content_id,
        'cdn_urls': cdn_result['urls'],
        'available_profiles': cdn_result['profiles']
    })

    # Step 6: Trigger recommendations update
    yield ctx.call_activity(notify_new_content, input=content)

    return {'status': 'published', 'content_id': content_id,
            'cdn_urls': cdn_result['urls']}
```

## Viewer Session Tracking with Dapr Actors

```csharp
// ViewerSessionActor.cs
[Actor(TypeName = "ViewerSessionActor")]
public class ViewerSessionActor : Actor, IViewerSessionActor
{
    public async Task<WatchProgress> UpdateProgress(string contentId, int positionSeconds)
    {
        var progress = await StateManager.GetOrAddStateAsync(
            $"progress:{contentId}",
            new WatchProgress { ContentId = contentId, PositionSeconds = 0 }
        );

        progress.PositionSeconds = positionSeconds;
        progress.LastUpdated = DateTime.UtcNow;

        // Mark as watched if >90% complete
        var metadata = await GetContentMetadata(contentId);
        if (positionSeconds > metadata.DurationSeconds * 0.9)
        {
            progress.Completed = true;
        }

        await StateManager.SetStateAsync($"progress:{contentId}", progress);

        // Publish analytics event every 30 seconds
        if (positionSeconds % 30 == 0)
        {
            await PublishViewingEvent(contentId, positionSeconds);
        }

        return progress;
    }
}
```

## Real-Time Recommendation Events

```python
# recommendation_service/recommender.py
@app.route('/events/content-viewed', methods=['POST'])
def handle_content_viewed():
    event = request.json.get('data', {})
    user_id = event['user_id']
    content_id = event['content_id']
    watch_duration = event.get('watch_duration_seconds', 0)
    total_duration = event.get('content_duration_seconds', 1)

    engagement_score = min(1.0, watch_duration / total_duration)

    with DaprClient() as client:
        # Update user engagement history
        history_key = f"history:{user_id}"
        history = json.loads(
            client.get_state("recommendation-statestore", history_key).data or "[]"
        )

        history.insert(0, {
            'content_id': content_id,
            'engagement': engagement_score,
            'timestamp': event['timestamp']
        })
        history = history[:500]  # Keep last 500 items

        client.save_state("recommendation-statestore", history_key,
                          json.dumps(history))

        # Trigger recommendation refresh if high engagement
        if engagement_score > 0.7:
            client.publish_event("media-pubsub", "refresh-recommendations",
                                 {'user_id': user_id})

    return jsonify({'status': 'SUCCESS'})
```

## Analytics Pipeline via Pub/Sub

Stream viewing analytics to a data warehouse:

```yaml
# components/analytics-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: analytics-stream
spec:
  type: bindings.aws.kinesis
  version: v1
  metadata:
    - name: streamName
      value: viewer-analytics
    - name: region
      value: us-east-1
```

```python
@app.route('/events/viewing-event', methods=['POST'])
def handle_viewing_event():
    event = request.json.get('data', {})

    with DaprClient() as client:
        # Forward to Kinesis for data warehouse ingestion
        client.invoke_binding(
            binding_name="analytics-stream",
            operation="create",
            data=json.dumps(event).encode(),
            binding_metadata={"partitionKey": event.get('user_id', 'anonymous')}
        )

    return jsonify({'status': 'SUCCESS'})
```

## Summary

Dapr enables media streaming platforms through Workflow fan-out for parallel multi-bitrate transcoding, Actor-based viewer sessions for per-user watch progress without shared state contention, pub/sub for content event distribution to recommendation and analytics services, and output bindings for real-time analytics streaming to data pipelines.
