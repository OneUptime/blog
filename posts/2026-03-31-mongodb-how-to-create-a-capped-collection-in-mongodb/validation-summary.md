# Validation Summary: How to Create a Capped Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (capped collections)
- JavaScript / mongosh shell
- Node.js MongoDB driver (practical use case example)

## Sources Consulted
- [MongoDB Manual — Capped Collections](https://www.mongodb.com/docs/manual/core/capped-collections/)
- [MongoDB Manual — convertToCapped](https://www.mongodb.com/docs/manual/reference/command/convertToCapped/)
- [MongoDB Community Forum — Confusion About Deleting Documents in Capped Collections](https://www.mongodb.com/community/forums/t/confusion-about-deleting-documents-in-capped-collections/205495)
- [MongoDB JIRA — DOCS-7373: capped collections do not allow updates that change document size](https://jira.mongodb.org/browse/DOCS-7373)
- [MongoDB Raw Documentation Source (GitHub)](https://raw.githubusercontent.com/mongodb/docs/master/source/core/capped-collections.txt)
- [GeeksforGeeks — Capped Collections in MongoDB](https://www.geeksforgeeks.org/capped-collections-in-mongodb/)

## Issues Found

### 1. Update size restriction was inaccurate
- **What was wrong:** The post stated "Updates are allowed as long as the document size does not change (or grow). You cannot increase a document's size." This implied that shrinking documents was permitted. Since MongoDB 3.2, the document size cannot change at all during updates — neither grow nor shrink.
- **What was changed:** Updated the text to "Updates are allowed as long as the document size does not change. You cannot increase or decrease a document's size."

### 2. Update code example was incorrect
- **What was wrong:** The example used `$set: { acknowledged: true }` on a document that did not have an `acknowledged` field. Adding a new field increases the document size, which would cause a "Cannot change the size of a document in a capped collection" error — directly contradicting the stated restriction.
- **What was changed:** Replaced the example with `$set: { level: "SEEN" }`, which updates an existing field (`level`) to a string of the same byte length ("WARN" → "SEEN"), keeping the document size unchanged.

### 3. Transaction restriction was vague
- **What was wrong:** The post stated "Transactions on capped collections have limited support," which is ambiguous.
- **What was changed:** Replaced with the specific restriction from the official documentation: "You cannot write to capped collections in transactions."

## Review Notes
- Starting in MongoDB 5.0, deletion of documents from capped collections is actually permitted (confirmed by a MongoDB employee in the community forums), though the official documentation has not been updated to reflect this change. The blog post's claim that "You cannot delete individual documents from a capped collection" aligns with the current official documentation, so it was left unchanged. Authors may wish to add a version-specific note about this in the future.
- The `db.collection.stats()` method used in the "Verifying a Capped Collection" section is deprecated starting in MongoDB 6.2 in favor of the `$collStats` aggregation stage. It still works but may be removed in a future version.
- The post does not mention that capped collections are not supported in Stable API V1 or on Atlas serverless instances. These are niche restrictions that may be worth noting in a future update.
