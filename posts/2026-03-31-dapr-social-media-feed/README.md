# How to Build a Social Media Feed with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Social Media, Pub/Sub, Feed, Actor

Description: Learn how to build a social media feed using Dapr pub/sub for activity broadcasting and Actors for per-user feed management with fan-out-on-write.

---

## Overview

A social media feed requires fan-out: when a user posts, all their followers should see it in their feed. Dapr pub/sub handles activity broadcasting and Actors maintain per-user feed state with efficient fan-out-on-write.

## Feed Architecture

Two approaches exist for feed delivery:
- **Fan-out-on-write**: Write post to all follower feeds immediately (fast reads, expensive writes)
- **Fan-out-on-read**: Build feed on read by querying followed users (cheap writes, expensive reads)

Dapr Actors with pub/sub implement fan-out-on-write efficiently.

## Activity Model

```go
package main

type ActivityType string

const (
    ActivityPost    ActivityType = "post"
    ActivityLike    ActivityType = "like"
    ActivityComment ActivityType = "comment"
    ActivityShare   ActivityType = "share"
    ActivityFollow  ActivityType = "follow"
)

type Activity struct {
    ID         string       `json:"id"`
    UserID     string       `json:"userId"`
    Username   string       `json:"username"`
    Type       ActivityType `json:"type"`
    ContentID  string       `json:"contentId"`
    Content    string       `json:"content"`
    Timestamp  int64        `json:"timestamp"`
    Likes      int          `json:"likes"`
    Comments   int          `json:"comments"`
}
```

## Post Creation with Fan-Out

```go
func handleCreatePost(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-ID")
    var req struct {
        Content string `json:"content"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    activity := Activity{
        ID:        uuid.New().String(),
        UserID:    userID,
        Type:      ActivityPost,
        Content:   req.Content,
        Timestamp: time.Now().Unix(),
    }

    // Save the post
    data, _ := json.Marshal(activity)
    daprClient.SaveState(r.Context(), "statestore", "post:"+activity.ID, data, nil)

    // Trigger fan-out via pub/sub
    daprClient.PublishEvent(r.Context(), "social-pubsub", "new-post", activity)

    json.NewEncoder(w).Encode(activity)
}
```

## Fan-Out Handler

```go
func handleNewPost(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var activity Activity
    json.Unmarshal(e.RawData, &activity)

    // Get follower list
    followersItem, _ := daprClient.GetState(ctx, "social-store", "followers:"+activity.UserID, nil)
    var followers []string
    json.Unmarshal(followersItem.Value, &followers)

    // Fan out to each follower's feed actor
    activityData, _ := json.Marshal(activity)
    for _, followerID := range followers {
        daprClient.InvokeActor(ctx, &dapr.InvokeActorRequest{
            ActorType: "Feed",
            ActorID:   followerID,
            Method:    "AddActivity",
            Data:      activityData,
        })
    }
    return false, nil
}
```

## Feed Actor

```go
type FeedState struct {
    UserID     string     `json:"userId"`
    Activities []Activity `json:"activities"`
}

type FeedActor struct {
    actor.ServerImplBase
}

func (a *FeedActor) Type() string {
    return "Feed"
}

func (a *FeedActor) AddActivity(ctx context.Context, activity *Activity) error {
    var state FeedState
    a.GetStateManager().Get(ctx, "feed", &state)

    // Prepend to feed (newest first)
    state.Activities = append([]Activity{*activity}, state.Activities...)

    // Keep last 500 activities
    if len(state.Activities) > 500 {
        state.Activities = state.Activities[:500]
    }

    return a.GetStateManager().Set(ctx, "feed", state)
}

func (a *FeedActor) GetFeed(ctx context.Context, req *struct{ Offset, Limit int }) ([]Activity, error) {
    var state FeedState
    a.GetStateManager().Get(ctx, "feed", &state)

    start := req.Offset
    end := req.Offset + req.Limit
    if start >= len(state.Activities) {
        return []Activity{}, nil
    }
    if end > len(state.Activities) {
        end = len(state.Activities)
    }
    return state.Activities[start:end], nil
}
```

## Follow/Unfollow

```go
func handleFollow(w http.ResponseWriter, r *http.Request) {
    followerID := r.Header.Get("X-User-ID")
    followeeID := r.PathValue("userId")
    ctx := r.Context()

    // Update followers list
    key := "followers:" + followeeID
    item, _ := daprClient.GetState(ctx, "social-store", key, nil)
    var followers []string
    json.Unmarshal(item.Value, &followers)
    followers = append(followers, followerID)
    data, _ := json.Marshal(followers)
    daprClient.SaveState(ctx, "social-store", key, data, nil)

    // Publish follow event
    daprClient.PublishEvent(ctx, "social-pubsub", "user-followed", map[string]string{
        "followerId": followerID,
        "followeeId": followeeID,
    })

    w.WriteHeader(http.StatusNoContent)
}
```

## Feed API

```go
func handleGetFeed(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-ID")
    offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
    limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
    if limit == 0 {
        limit = 20
    }

    reqData, _ := json.Marshal(struct{ Offset, Limit int }{offset, limit})
    resp, err := daprClient.InvokeActor(r.Context(), &dapr.InvokeActorRequest{
        ActorType: "Feed",
        ActorID:   userID,
        Method:    "GetFeed",
        Data:      reqData,
    })
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }
    var activities []Activity
    json.Unmarshal(resp.Data, &activities)

    json.NewEncoder(w).Encode(activities)
}
```

## Summary

Dapr pub/sub and Actors implement social media feed fan-out efficiently. When a user posts, a pub/sub event triggers the fan-out handler that distributes the activity to each follower's Feed Actor. Feed Actors maintain sorted, bounded feed state per user, providing O(1) feed reads. This architecture scales to millions of users with isolated actor instances handling each user's feed independently.
