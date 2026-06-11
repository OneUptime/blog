# Validation Summary: How to Build Offline Capabilities

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- JavaScript
- Web Storage API (`localStorage` and `sessionStorage`)
- IndexedDB
- Service Workers
- Cache API
- Background Synchronization API
- Network Information API
- `navigator.onLine`, `online`, and `offline` events
- React hooks
- Conflict resolution and offline sync queues

## Sources Consulted
- MDN Web Docs: Web Storage API - https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- MDN Web Docs: Storage quotas and eviction criteria - https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- MDN Web Docs: IndexedDB API - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- W3C: Indexed Database API 3.0 - https://www.w3.org/TR/IndexedDB/
- MDN Web Docs: Navigator.onLine - https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
- MDN Web Docs: Network Information API - https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API
- MDN Web Docs: Service Worker API - https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- MDN Web Docs: Background Synchronization API - https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API
- WICG: Web Background Synchronization specification - https://wicg.github.io/background-sync/spec/

## Issues Found
- The `OfflineDatabase.put()` helper always set `_syncStatus` to `pending`, even when callers passed records with `_syncStatus: 'synced'`. This would cause successful sync and conflict-resolution paths to write records back as pending. Changed `put()` to preserve an explicit `_syncStatus` and `_updatedAt` when provided.
- The first `syncQueue` object store schema did not define a `status` index, but `SyncQueue.processQueue()` queries `store.index('status')`. Added the missing `status` index to match the later code and avoid a runtime `NotFoundError`.
- The service worker best-practice summary stated background sync as a general capability. Background Synchronization has limited browser support, so the text now says service workers enable background sync capabilities "where supported."

## Review Notes
The examples are illustrative and assume surrounding application code such as `apiClient`, React imports, a `networkMonitor` instance, and server endpoints. The Background Synchronization API is useful for this pattern but is not baseline across all major browsers, so production applications should include a foreground sync fallback like the article's network monitor path.
