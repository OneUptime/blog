# How to Build a Content Management System with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CMS, State, Pub/Sub, Cache

Description: Learn how to build a content management system using Dapr state management for content storage, pub/sub for cache invalidation, and bindings for media storage.

---

## Overview

A content management system (CMS) manages structured content (pages, articles, media) with versioning, publishing workflows, and multi-channel delivery. Dapr's state, pub/sub, and binding building blocks provide the infrastructure for a scalable headless CMS.

## Content Data Model

```go
package main

type ContentStatus string

const (
    StatusDraft     ContentStatus = "draft"
    StatusReview    ContentStatus = "review"
    StatusPublished ContentStatus = "published"
    StatusArchived  ContentStatus = "archived"
)

type Content struct {
    ID          string            `json:"id"`
    Type        string            `json:"type"` // "page", "article", "product"
    Slug        string            `json:"slug"`
    Title       string            `json:"title"`
    Body        string            `json:"body"`
    Metadata    map[string]string `json:"metadata"`
    Tags        []string          `json:"tags"`
    AuthorID    string            `json:"authorId"`
    Status      ContentStatus     `json:"status"`
    Version     int               `json:"version"`
    PublishedAt *int64            `json:"publishedAt"`
    UpdatedAt   int64             `json:"updatedAt"`
}
```

## Content Storage with Versioning

```go
type CMSService struct {
    daprClient dapr.Client
}

func (svc *CMSService) SaveContent(ctx context.Context, content Content) error {
    content.UpdatedAt = time.Now().Unix()
    data, _ := json.Marshal(content)

    // Save current version
    err := svc.daprClient.SaveState(ctx, "content-store", "content:"+content.ID, data, nil)
    if err != nil {
        return err
    }

    // Save version history
    versionKey := fmt.Sprintf("version:%s:%d", content.ID, content.Version)
    svc.daprClient.SaveState(ctx, "content-store", versionKey, data, nil)

    // Update slug index
    slugData, _ := json.Marshal(content.ID)
    return svc.daprClient.SaveState(ctx, "content-store", "slug:"+content.Slug, slugData, nil)
}

func (svc *CMSService) GetBySlug(ctx context.Context, slug string) (*Content, error) {
    // Check cache first
    cached, _ := svc.daprClient.GetState(ctx, "cache-store", "cache:slug:"+slug, nil)
    if cached.Value != nil {
        var content Content
        json.Unmarshal(cached.Value, &content)
        return &content, nil
    }

    // Get ID from slug index
    idItem, _ := svc.daprClient.GetState(ctx, "content-store", "slug:"+slug, nil)
    if idItem.Value == nil {
        return nil, fmt.Errorf("content not found")
    }

    var contentID string
    json.Unmarshal(idItem.Value, &contentID)

    // Get content
    item, _ := svc.daprClient.GetState(ctx, "content-store", "content:"+contentID, nil)
    var content Content
    json.Unmarshal(item.Value, &content)

    // Cache for 5 minutes
    svc.daprClient.SaveState(ctx, "cache-store", "cache:slug:"+slug, item.Value, map[string]string{"ttlInSeconds": "300"})

    return &content, nil
}
```

## Publishing Workflow

```go
func (svc *CMSService) PublishContent(ctx context.Context, contentID string) error {
    item, err := svc.daprClient.GetState(ctx, "content-store", "content:"+contentID, nil)
    if err != nil || item.Value == nil {
        return fmt.Errorf("content not found")
    }

    var content Content
    json.Unmarshal(item.Value, &content)

    now := time.Now().Unix()
    content.Status = StatusPublished
    content.PublishedAt = &now
    content.Version++

    if err := svc.SaveContent(ctx, content); err != nil {
        return err
    }

    // Invalidate cache
    svc.daprClient.DeleteState(ctx, "cache-store", "cache:slug:"+content.Slug, nil)

    // Publish event for CDN invalidation, search indexing
    return svc.daprClient.PublishEvent(ctx, "pubsub", "content-published", map[string]any{
        "contentId": content.ID,
        "slug":      content.Slug,
        "type":      content.Type,
    })
}
```

## Cache Invalidation Handler

```go
func handleContentPublished(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var event struct {
        ContentID string `json:"contentId"`
        Slug      string `json:"slug"`
        Type      string `json:"type"`
    }
    json.Unmarshal(e.RawData, &event)

    // Invalidate CDN cache
    daprClient.InvokeMethod(ctx, "cdn-service", "/invalidate?slug="+event.Slug, "DELETE")

    // Update search index
    daprClient.InvokeMethod(ctx, "search-service", "/index/"+event.ContentID, "PUT")

    return false, nil
}
```

## Media Upload via S3 Binding

```go
func (svc *CMSService) UploadMedia(ctx context.Context, filename string, data []byte) (string, error) {
    mediaKey := fmt.Sprintf("media/%s/%s", time.Now().Format("2006/01/02"), filename)

    _, err := svc.daprClient.InvokeBinding(ctx, &dapr.InvokeBindingRequest{
        Name:      "media-storage",
        Operation: "create",
        Data:      data,
        Metadata: map[string]string{
            "key":         mediaKey,
            "contentType": detectContentType(filename),
        },
    })
    if err != nil {
        return "", err
    }

    return "https://media.example.com/" + mediaKey, nil
}
```

## Summary

Dapr provides the infrastructure for a headless CMS: state stores handle content versioning and slug indexing, a separate cache store speeds up read-heavy public APIs, pub/sub events drive CDN invalidation and search index updates on publish, and S3 bindings manage media uploads. This architecture separates content management from delivery concerns, enabling the same content to be served across web, mobile, and third-party channels.
