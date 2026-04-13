# How to Design a Media Streaming Schema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema, Design, Streaming

Description: Learn how to model a media streaming platform in MongoDB covering content catalogs, user profiles, watchlists, playback state, and recommendation data.

---

## Core Collections

A media streaming platform requires: `content`, `users`, `watchlist`, `playbackState`, and `reviews`. MongoDB suits this domain because content metadata varies widely between movies, series, episodes, and live events, and per-user state needs fast point reads.

## Content Collection

```json
{
  "_id": "content-001",
  "type": "series",
  "title": "The Great Detective",
  "slug": "the-great-detective",
  "genres": ["mystery", "thriller"],
  "status": "active",
  "maturityRating": "TV-14",
  "languages": ["en", "es", "fr"],
  "synopsis": "A brilliant detective solves complex cases...",
  "cast": [
    { "name": "John Doe", "role": "Detective Harris", "order": 1 }
  ],
  "seasons": [
    {
      "seasonNumber": 1,
      "episodeCount": 8,
      "releaseYear": 2024
    }
  ],
  "thumbnail": "https://cdn.example.com/shows/great-detective/thumb.jpg",
  "trailerUrl": "https://cdn.example.com/trailers/great-detective.mp4",
  "availableRegions": ["US", "CA", "GB", "AU"],
  "tags": ["crime", "london", "british"],
  "stats": {
    "avgRating": 8.3,
    "ratingCount": 45000,
    "viewCount": 2100000
  },
  "createdAt": "2024-01-15T00:00:00Z"
}
```

## Episode Collection (for Series)

Episodes are queried independently (next episode autoplay) so they live in their own collection:

```json
{
  "_id": "ep-001-s1e3",
  "contentId": "content-001",
  "seasonNumber": 1,
  "episodeNumber": 3,
  "title": "The Clockwork Killer",
  "synopsis": "A series of clock-themed murders...",
  "durationSeconds": 2820,
  "videoManifestUrl": "https://cdn.example.com/hls/ep-001-s1e3/master.m3u8",
  "subtitles": [
    { "language": "en", "url": "https://cdn.example.com/subs/ep-001-s1e3-en.vtt" }
  ],
  "releaseDate": "2024-02-01T00:00:00Z",
  "skipIntroSeconds": { "start": 30, "end": 90 }
}
```

## User Profile Collection

```json
{
  "_id": "user-456",
  "email": "alice@example.com",
  "plan": "premium",
  "planExpiresAt": "2027-01-01T00:00:00Z",
  "profiles": [
    { "profileId": "prof-1", "name": "Alice", "avatar": "avatar1.png", "maturityLevel": "adult" },
    { "profileId": "prof-2", "name": "Kids",  "avatar": "avatar2.png", "maturityLevel": "kids" }
  ],
  "devices": [
    { "deviceId": "device-abc", "type": "smart_tv", "lastSeen": "2026-03-30T21:00:00Z" }
  ],
  "createdAt": "2024-06-01T00:00:00Z"
}
```

## Playback State Collection

Fast reads and writes per user/profile/content - keep this lean:

```json
{
  "_id": { "profileId": "prof-1", "contentId": "content-001" },
  "episodeId": "ep-001-s1e3",
  "positionSeconds": 1420,
  "completedEpisodes": ["ep-001-s1e1", "ep-001-s1e2"],
  "lastWatchedAt": "2026-03-30T22:15:00Z"
}
```

## Watchlist Collection

```json
{
  "_id": ObjectId(),
  "profileId": "prof-1",
  "contentId": "content-001",
  "addedAt": "2026-03-15T10:00:00Z"
}
```

## Key Indexes

```javascript
// Content discovery
db.content.createIndex({ status: 1, genres: 1, "stats.avgRating": -1 })
db.content.createIndex({ availableRegions: 1, type: 1 })
db.content.createIndex({ title: "text", synopsis: "text" })

// Episode lookup (next episode autoplay)
db.episodes.createIndex({ contentId: 1, seasonNumber: 1, episodeNumber: 1 })

// Playback state - primary key is the compound _id
db.playbackState.createIndex({ "_id.profileId": 1, lastWatchedAt: -1 })  // "continue watching"

// Watchlist
db.watchlist.createIndex({ profileId: 1, addedAt: -1 })
```

## Summary

Embed series seasons as a summary array in the content document but store individual episodes separately for autoplay queries. Use a compound `_id` on playback state for O(1) point reads on the critical "resume watching" path. Denormalize view count and ratings as counters on the content document to avoid aggregation on every catalog page load. Use multi-profile support embedded in the user document since a user rarely has more than five profiles.
