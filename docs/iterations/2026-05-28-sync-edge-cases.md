# Iteration Record: Sync Edge Cases

Date: 2026-05-28

## Boundary Condition Issues

This note records the sync-related edge cases found during Day 5. These issues are not being solved in the current iteration, but they should guide the next stages of the collaboration protocol.

## `opId` Prevents Duplicate Application, Not Ordering Issues

`opId` can prevent the same operation from being applied more than once, but it does not solve event ordering.

For example, if `event1` arrives later than `event2`, the client may apply the events in the wrong order. This needs to be considered in multi-user collaboration because network transmission speed can vary between clients. A future approach may need timestamps or another ordering mechanism.

## `processedOps` Can Grow Without Bound

The server currently remembers every processed `opId`. This means memory usage can keep growing over time, and `opId` growth can become very fast in an active room.

Possible future solutions include:

- TTL-based cleanup
- Event logs
- Snapshot compaction
- Database persistence

This is intentionally not being handled yet.

## `snapshotReady` Is Rough but Effective

`snapshotReady` is a simple solution, but it works for the current stage.

It prevents users from drawing before the room has finished initializing. Future approaches may include:

- Optimistic queues
- Pending operations
- Snapshot version plus replay
- Conflict resolution

These concepts are not fully understood yet and will need more study before implementation.

## `clear_room` Is Currently Destructive

The current `clear_room` operation clears the whiteboard for everyone as soon as it is applied.

If undo support is added later, `clear_room` will become more complicated. It should not be treated as only a UI action. It is a shared document operation that affects every client in the room.

## Day 5 Unresolved Problems

The following problems are still unresolved after Day 5:

- Out-of-order events
- Data loss after server restarts
- Unbounded `processedOps` growth
- Merging operations created while a client is offline

These will be addressed later when the project introduces event logs, database persistence, CRDTs, or a more complete synchronization protocol.
