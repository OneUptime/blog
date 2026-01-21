# How to Implement Player Inventory Systems with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Gaming, Inventory, Item Storage, Trading, Hashes, Transactions, Game Development

Description: A comprehensive guide to building player inventory systems with Redis, covering item storage, stack management, equipment slots, trading between players, and preventing item duplication.

---

Inventory systems are fundamental to most games - from simple item collections to complex RPG gear management with trading economies. Redis provides the speed and atomic operations needed to handle inventory transactions reliably. This guide covers building production-ready inventory systems that scale.

## Inventory System Requirements

A robust inventory system needs to handle:

1. **Fast reads** - Players view their inventory frequently
2. **Atomic transactions** - Item transfers must be all-or-nothing
3. **Concurrent access** - Multiple actions on the same inventory
4. **Data integrity** - No item duplication or loss
5. **Scalability** - Millions of players with thousands of items each

## Data Model Design

### Item Definition

```python
import redis
import json
import time
import uuid
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

class ItemRarity(Enum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"

class ItemType(Enum):
    WEAPON = "weapon"
    ARMOR = "armor"
    CONSUMABLE = "consumable"
    MATERIAL = "material"
    CURRENCY = "currency"
    QUEST = "quest"

@dataclass
class ItemDefinition:
    item_id: str
    name: str
    description: str
    item_type: ItemType
    rarity: ItemRarity
    max_stack: int
    tradeable: bool
    sellable: bool
    base_value: int
    icon_url: str
    attributes: Dict[str, Any] = None

@dataclass
class InventoryItem:
    instance_id: str  # Unique instance for this stack
    item_id: str      # Reference to ItemDefinition
    quantity: int
    acquired_at: float
    metadata: Dict[str, Any] = None  # Enchantments, durability, etc.
```

### Redis Key Structure

```python
class InventoryKeys:
    """Redis key patterns for inventory management."""

    @staticmethod
    def item_definitions() -> str:
        return "items:definitions"

    @staticmethod
    def item_definition(item_id: str) -> str:
        return f"items:def:{item_id}"

    @staticmethod
    def player_inventory(player_id: str) -> str:
        return f"player:{player_id}:inventory"

    @staticmethod
    def player_equipment(player_id: str) -> str:
        return f"player:{player_id}:equipment"

    @staticmethod
    def player_currency(player_id: str) -> str:
        return f"player:{player_id}:currency"

    @staticmethod
    def trade_session(trade_id: str) -> str:
        return f"trade:{trade_id}"

    @staticmethod
    def player_active_trade(player_id: str) -> str:
        return f"player:{player_id}:active_trade"
```

## Item Definition Registry

```python
class ItemRegistry:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.keys = InventoryKeys()

    def register_item(self, item: ItemDefinition) -> bool:
        """Register a new item definition."""
        item_data = {
            "item_id": item.item_id,
            "name": item.name,
            "description": item.description,
            "type": item.item_type.value,
            "rarity": item.rarity.value,
            "max_stack": item.max_stack,
            "tradeable": str(item.tradeable),
            "sellable": str(item.sellable),
            "base_value": item.base_value,
            "icon_url": item.icon_url,
            "attributes": json.dumps(item.attributes or {})
        }

        pipe = self.redis.pipeline()
        pipe.hset(self.keys.item_definition(item.item_id), mapping=item_data)
        pipe.sadd(self.keys.item_definitions(), item.item_id)
        pipe.execute()

        return True

    def get_item(self, item_id: str) -> Optional[Dict]:
        """Get item definition by ID."""
        data = self.redis.hgetall(self.keys.item_definition(item_id))
        if not data:
            return None

        result = {
            k.decode() if isinstance(k, bytes) else k:
            v.decode() if isinstance(v, bytes) else v
            for k, v in data.items()
        }

        # Parse JSON fields
        if "attributes" in result:
            result["attributes"] = json.loads(result["attributes"])

        return result

    def get_all_items(self) -> List[Dict]:
        """Get all item definitions."""
        item_ids = self.redis.smembers(self.keys.item_definitions())
        items = []

        for item_id in item_ids:
            item_id = item_id.decode() if isinstance(item_id, bytes) else item_id
            item = self.get_item(item_id)
            if item:
                items.append(item)

        return items
```

## Core Inventory Manager

```python
class InventoryManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.keys = InventoryKeys()
        self.registry = ItemRegistry(redis_client)
        self.max_inventory_slots = 100

    def add_item(
        self,
        player_id: str,
        item_id: str,
        quantity: int = 1,
        metadata: Dict = None
    ) -> Dict:
        """Add item(s) to player inventory."""
        # Get item definition
        item_def = self.registry.get_item(item_id)
        if not item_def:
            return {"success": False, "error": "Item not found"}

        inventory_key = self.keys.player_inventory(player_id)
        max_stack = int(item_def.get("max_stack", 1))

        # Use Lua script for atomic operation
        lua_script = """
        local inventory_key = KEYS[1]
        local item_id = ARGV[1]
        local quantity = tonumber(ARGV[2])
        local max_stack = tonumber(ARGV[3])
        local max_slots = tonumber(ARGV[4])
        local metadata = ARGV[5]
        local timestamp = ARGV[6]

        -- Get current inventory
        local inventory = redis.call('HGETALL', inventory_key)
        local slots = {}
        local existing_stacks = {}

        for i = 1, #inventory, 2 do
            local slot_id = inventory[i]
            local slot_data = cjson.decode(inventory[i + 1])
            slots[slot_id] = slot_data

            if slot_data.item_id == item_id and slot_data.quantity < max_stack then
                table.insert(existing_stacks, {slot_id = slot_id, data = slot_data})
            end
        end

        local remaining = quantity
        local added_to = {}

        -- Fill existing stacks first
        for _, stack in ipairs(existing_stacks) do
            if remaining <= 0 then break end

            local can_add = max_stack - stack.data.quantity
            local to_add = math.min(can_add, remaining)

            stack.data.quantity = stack.data.quantity + to_add
            remaining = remaining - to_add

            redis.call('HSET', inventory_key, stack.slot_id,
                cjson.encode(stack.data))

            table.insert(added_to, {
                slot_id = stack.slot_id,
                added = to_add,
                new_total = stack.data.quantity
            })
        end

        -- Create new stacks for remaining
        local slot_count = 0
        for _ in pairs(slots) do slot_count = slot_count + 1 end

        while remaining > 0 and slot_count < max_slots do
            local instance_id = ARGV[7] .. '_' .. tostring(slot_count)
            local to_add = math.min(max_stack, remaining)

            local new_stack = {
                instance_id = instance_id,
                item_id = item_id,
                quantity = to_add,
                acquired_at = tonumber(timestamp),
                metadata = cjson.decode(metadata)
            }

            redis.call('HSET', inventory_key, instance_id, cjson.encode(new_stack))

            table.insert(added_to, {
                slot_id = instance_id,
                added = to_add,
                new_total = to_add,
                new_stack = true
            })

            remaining = remaining - to_add
            slot_count = slot_count + 1
        end

        return cjson.encode({
            success = remaining == 0,
            added = quantity - remaining,
            overflow = remaining,
            stacks = added_to
        })
        """

        instance_base = str(uuid.uuid4())[:8]

        result = self.redis.eval(
            lua_script,
            1,
            inventory_key,
            item_id,
            quantity,
            max_stack,
            self.max_inventory_slots,
            json.dumps(metadata or {}),
            time.time(),
            instance_base
        )

        return json.loads(result)

    def remove_item(
        self,
        player_id: str,
        item_id: str,
        quantity: int = 1
    ) -> Dict:
        """Remove item(s) from player inventory."""
        inventory_key = self.keys.player_inventory(player_id)

        lua_script = """
        local inventory_key = KEYS[1]
        local item_id = ARGV[1]
        local quantity = tonumber(ARGV[2])

        -- Get all stacks of this item
        local inventory = redis.call('HGETALL', inventory_key)
        local stacks = {}

        for i = 1, #inventory, 2 do
            local slot_id = inventory[i]
            local slot_data = cjson.decode(inventory[i + 1])

            if slot_data.item_id == item_id then
                table.insert(stacks, {slot_id = slot_id, data = slot_data})
            end
        end

        -- Calculate total available
        local total_available = 0
        for _, stack in ipairs(stacks) do
            total_available = total_available + stack.data.quantity
        end

        if total_available < quantity then
            return cjson.encode({
                success = false,
                error = "Insufficient quantity",
                available = total_available,
                requested = quantity
            })
        end

        -- Remove from stacks (LIFO - last in, first out)
        local remaining = quantity
        local removed_from = {}

        -- Sort by acquired_at descending (remove newest first)
        table.sort(stacks, function(a, b)
            return (a.data.acquired_at or 0) > (b.data.acquired_at or 0)
        end)

        for _, stack in ipairs(stacks) do
            if remaining <= 0 then break end

            local to_remove = math.min(stack.data.quantity, remaining)
            stack.data.quantity = stack.data.quantity - to_remove
            remaining = remaining - to_remove

            if stack.data.quantity <= 0 then
                redis.call('HDEL', inventory_key, stack.slot_id)
            else
                redis.call('HSET', inventory_key, stack.slot_id,
                    cjson.encode(stack.data))
            end

            table.insert(removed_from, {
                slot_id = stack.slot_id,
                removed = to_remove,
                remaining = stack.data.quantity
            })
        end

        return cjson.encode({
            success = true,
            removed = quantity,
            stacks = removed_from
        })
        """

        result = self.redis.eval(
            lua_script,
            1,
            inventory_key,
            item_id,
            quantity
        )

        return json.loads(result)

    def get_inventory(self, player_id: str) -> Dict:
        """Get player's full inventory."""
        inventory_key = self.keys.player_inventory(player_id)
        raw_inventory = self.redis.hgetall(inventory_key)

        items = []
        total_value = 0

        for slot_id, item_data in raw_inventory.items():
            slot_id = slot_id.decode() if isinstance(slot_id, bytes) else slot_id
            item_data = item_data.decode() if isinstance(item_data, bytes) else item_data

            item = json.loads(item_data)
            item_def = self.registry.get_item(item["item_id"])

            if item_def:
                item["definition"] = item_def
                total_value += int(item_def.get("base_value", 0)) * item["quantity"]

            items.append(item)

        return {
            "player_id": player_id,
            "items": items,
            "slot_count": len(items),
            "max_slots": self.max_inventory_slots,
            "total_value": total_value
        }

    def get_item_count(self, player_id: str, item_id: str) -> int:
        """Get total count of a specific item in inventory."""
        inventory_key = self.keys.player_inventory(player_id)
        raw_inventory = self.redis.hgetall(inventory_key)

        total = 0
        for _, item_data in raw_inventory.items():
            item_data = item_data.decode() if isinstance(item_data, bytes) else item_data
            item = json.loads(item_data)

            if item["item_id"] == item_id:
                total += item["quantity"]

        return total

    def has_item(
        self,
        player_id: str,
        item_id: str,
        quantity: int = 1
    ) -> bool:
        """Check if player has enough of an item."""
        return self.get_item_count(player_id, item_id) >= quantity
```

## Equipment System

Handle equipped items separately from inventory:

```python
class EquipmentSlot(Enum):
    HEAD = "head"
    CHEST = "chest"
    LEGS = "legs"
    FEET = "feet"
    HANDS = "hands"
    MAIN_HAND = "main_hand"
    OFF_HAND = "off_hand"
    RING_1 = "ring_1"
    RING_2 = "ring_2"
    NECKLACE = "necklace"

class EquipmentManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.keys = InventoryKeys()
        self.inventory = InventoryManager(redis_client)

    def equip_item(
        self,
        player_id: str,
        instance_id: str,
        slot: EquipmentSlot
    ) -> Dict:
        """Equip an item from inventory to an equipment slot."""
        inventory_key = self.keys.player_inventory(player_id)
        equipment_key = self.keys.player_equipment(player_id)

        lua_script = """
        local inventory_key = KEYS[1]
        local equipment_key = KEYS[2]
        local instance_id = ARGV[1]
        local slot = ARGV[2]

        -- Get item from inventory
        local item_json = redis.call('HGET', inventory_key, instance_id)
        if not item_json then
            return cjson.encode({success = false, error = "Item not found in inventory"})
        end

        local item = cjson.decode(item_json)

        -- Check if slot already has an item
        local current_equipped = redis.call('HGET', equipment_key, slot)
        local unequipped = nil

        if current_equipped then
            -- Move currently equipped item back to inventory
            local equipped_item = cjson.decode(current_equipped)
            redis.call('HSET', inventory_key, equipped_item.instance_id,
                current_equipped)
            unequipped = equipped_item
        end

        -- Remove from inventory (for non-stackable equipment)
        if item.quantity <= 1 then
            redis.call('HDEL', inventory_key, instance_id)
        else
            item.quantity = item.quantity - 1
            redis.call('HSET', inventory_key, instance_id, cjson.encode(item))
            -- Create new instance for equipped item
            item.quantity = 1
            item.instance_id = instance_id .. '_eq'
        end

        -- Equip the item
        redis.call('HSET', equipment_key, slot, cjson.encode(item))

        return cjson.encode({
            success = true,
            equipped = item,
            unequipped = unequipped,
            slot = slot
        })
        """

        result = self.redis.eval(
            lua_script,
            2,
            inventory_key,
            equipment_key,
            instance_id,
            slot.value
        )

        return json.loads(result)

    def unequip_item(
        self,
        player_id: str,
        slot: EquipmentSlot
    ) -> Dict:
        """Unequip an item and return it to inventory."""
        inventory_key = self.keys.player_inventory(player_id)
        equipment_key = self.keys.player_equipment(player_id)

        lua_script = """
        local inventory_key = KEYS[1]
        local equipment_key = KEYS[2]
        local slot = ARGV[1]

        local item_json = redis.call('HGET', equipment_key, slot)
        if not item_json then
            return cjson.encode({success = false, error = "No item in slot"})
        end

        local item = cjson.decode(item_json)

        -- Move to inventory
        redis.call('HSET', inventory_key, item.instance_id, item_json)

        -- Remove from equipment
        redis.call('HDEL', equipment_key, slot)

        return cjson.encode({
            success = true,
            unequipped = item,
            slot = slot
        })
        """

        result = self.redis.eval(
            lua_script,
            2,
            inventory_key,
            equipment_key,
            slot.value
        )

        return json.loads(result)

    def get_equipment(self, player_id: str) -> Dict:
        """Get all equipped items."""
        equipment_key = self.keys.player_equipment(player_id)
        raw_equipment = self.redis.hgetall(equipment_key)

        equipment = {}
        for slot, item_data in raw_equipment.items():
            slot = slot.decode() if isinstance(slot, bytes) else slot
            item_data = item_data.decode() if isinstance(item_data, bytes) else item_data
            equipment[slot] = json.loads(item_data)

        return {
            "player_id": player_id,
            "equipment": equipment
        }
```

## Trading System

Secure item trading between players:

```python
class TradeStatus(Enum):
    PENDING = "pending"
    BOTH_ACCEPTED = "both_accepted"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TradingSystem:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.keys = InventoryKeys()
        self.inventory = InventoryManager(redis_client)

    def initiate_trade(
        self,
        initiator_id: str,
        target_id: str
    ) -> Dict:
        """Initiate a trade between two players."""
        # Check if either player is already in a trade
        initiator_trade = self.redis.get(self.keys.player_active_trade(initiator_id))
        target_trade = self.redis.get(self.keys.player_active_trade(target_id))

        if initiator_trade:
            return {"success": False, "error": "You are already in a trade"}
        if target_trade:
            return {"success": False, "error": "Target player is already in a trade"}

        trade_id = str(uuid.uuid4())
        trade_key = self.keys.trade_session(trade_id)

        trade_data = {
            "trade_id": trade_id,
            "initiator_id": initiator_id,
            "target_id": target_id,
            "initiator_items": json.dumps([]),
            "target_items": json.dumps([]),
            "initiator_gold": 0,
            "target_gold": 0,
            "initiator_accepted": "false",
            "target_accepted": "false",
            "status": TradeStatus.PENDING.value,
            "created_at": time.time()
        }

        pipe = self.redis.pipeline()
        pipe.hset(trade_key, mapping=trade_data)
        pipe.expire(trade_key, 300)  # 5 minute timeout
        pipe.set(self.keys.player_active_trade(initiator_id), trade_id, ex=300)
        pipe.set(self.keys.player_active_trade(target_id), trade_id, ex=300)
        pipe.execute()

        # Notify target player
        self.redis.publish(
            f"player:{target_id}:notifications",
            json.dumps({
                "type": "trade_request",
                "trade_id": trade_id,
                "from_player": initiator_id
            })
        )

        return {"success": True, "trade_id": trade_id}

    def add_item_to_trade(
        self,
        trade_id: str,
        player_id: str,
        instance_id: str,
        quantity: int = 1
    ) -> Dict:
        """Add an item to the trade."""
        trade_key = self.keys.trade_session(trade_id)
        trade_data = self.redis.hgetall(trade_key)

        if not trade_data:
            return {"success": False, "error": "Trade not found"}

        # Determine which side of the trade
        initiator_id = trade_data[b"initiator_id"].decode()
        target_id = trade_data[b"target_id"].decode()

        if player_id == initiator_id:
            items_key = "initiator_items"
        elif player_id == target_id:
            items_key = "target_items"
        else:
            return {"success": False, "error": "You are not part of this trade"}

        # Reset acceptance when items change
        pipe = self.redis.pipeline()
        pipe.hset(trade_key, "initiator_accepted", "false")
        pipe.hset(trade_key, "target_accepted", "false")

        # Verify player has the item
        inventory = self.inventory.get_inventory(player_id)
        item_found = None

        for item in inventory["items"]:
            if item["instance_id"] == instance_id:
                if item["quantity"] >= quantity:
                    item_found = item
                break

        if not item_found:
            return {"success": False, "error": "Item not found or insufficient quantity"}

        # Check if item is tradeable
        item_def = self.inventory.registry.get_item(item_found["item_id"])
        if item_def and item_def.get("tradeable") == "False":
            return {"success": False, "error": "This item cannot be traded"}

        # Add to trade items
        current_items = json.loads(trade_data[items_key.encode()])
        current_items.append({
            "instance_id": instance_id,
            "item_id": item_found["item_id"],
            "quantity": quantity
        })

        pipe.hset(trade_key, items_key, json.dumps(current_items))
        pipe.execute()

        return {"success": True, "items": current_items}

    def accept_trade(self, trade_id: str, player_id: str) -> Dict:
        """Accept the trade (both players must accept)."""
        trade_key = self.keys.trade_session(trade_id)

        lua_script = """
        local trade_key = KEYS[1]
        local player_id = ARGV[1]

        local trade = redis.call('HGETALL', trade_key)
        if #trade == 0 then
            return cjson.encode({success = false, error = "Trade not found"})
        end

        local trade_data = {}
        for i = 1, #trade, 2 do
            trade_data[trade[i]] = trade[i + 1]
        end

        local initiator_id = trade_data['initiator_id']
        local target_id = trade_data['target_id']

        if player_id == initiator_id then
            redis.call('HSET', trade_key, 'initiator_accepted', 'true')
        elseif player_id == target_id then
            redis.call('HSET', trade_key, 'target_accepted', 'true')
        else
            return cjson.encode({success = false, error = "Not part of trade"})
        end

        -- Check if both accepted
        local initiator_accepted = redis.call('HGET', trade_key, 'initiator_accepted')
        local target_accepted = redis.call('HGET', trade_key, 'target_accepted')

        if initiator_accepted == 'true' and target_accepted == 'true' then
            redis.call('HSET', trade_key, 'status', 'both_accepted')
            return cjson.encode({
                success = true,
                both_accepted = true,
                ready_to_complete = true
            })
        end

        return cjson.encode({
            success = true,
            both_accepted = false,
            waiting_for = (initiator_accepted ~= 'true') and initiator_id or target_id
        })
        """

        result = self.redis.eval(lua_script, 1, trade_key, player_id)
        return json.loads(result)

    def complete_trade(self, trade_id: str) -> Dict:
        """Complete the trade - transfer items between players."""
        trade_key = self.keys.trade_session(trade_id)

        lua_script = """
        local trade_key = KEYS[1]
        local initiator_inv_key = KEYS[2]
        local target_inv_key = KEYS[3]

        -- Get trade data
        local trade = redis.call('HGETALL', trade_key)
        if #trade == 0 then
            return cjson.encode({success = false, error = "Trade not found"})
        end

        local trade_data = {}
        for i = 1, #trade, 2 do
            trade_data[trade[i]] = trade[i + 1]
        end

        -- Verify both accepted
        if trade_data['initiator_accepted'] ~= 'true' or
           trade_data['target_accepted'] ~= 'true' then
            return cjson.encode({success = false, error = "Both parties must accept"})
        end

        local initiator_items = cjson.decode(trade_data['initiator_items'])
        local target_items = cjson.decode(trade_data['target_items'])

        -- Verify items still exist and have sufficient quantity
        for _, item in ipairs(initiator_items) do
            local inv_item = redis.call('HGET', initiator_inv_key, item.instance_id)
            if not inv_item then
                return cjson.encode({success = false, error = "Item no longer available"})
            end
            local parsed = cjson.decode(inv_item)
            if parsed.quantity < item.quantity then
                return cjson.encode({success = false, error = "Insufficient quantity"})
            end
        end

        for _, item in ipairs(target_items) do
            local inv_item = redis.call('HGET', target_inv_key, item.instance_id)
            if not inv_item then
                return cjson.encode({success = false, error = "Item no longer available"})
            end
            local parsed = cjson.decode(inv_item)
            if parsed.quantity < item.quantity then
                return cjson.encode({success = false, error = "Insufficient quantity"})
            end
        end

        -- Execute the trade
        -- Remove from initiator, add to target
        for _, item in ipairs(initiator_items) do
            local inv_item = redis.call('HGET', initiator_inv_key, item.instance_id)
            local parsed = cjson.decode(inv_item)

            if parsed.quantity <= item.quantity then
                redis.call('HDEL', initiator_inv_key, item.instance_id)
            else
                parsed.quantity = parsed.quantity - item.quantity
                redis.call('HSET', initiator_inv_key, item.instance_id,
                    cjson.encode(parsed))
            end

            -- Add to target
            local new_instance_id = item.instance_id .. '_t'
            local new_item = {
                instance_id = new_instance_id,
                item_id = item.item_id,
                quantity = item.quantity,
                acquired_at = tonumber(ARGV[1]),
                metadata = parsed.metadata or {}
            }
            redis.call('HSET', target_inv_key, new_instance_id,
                cjson.encode(new_item))
        end

        -- Remove from target, add to initiator
        for _, item in ipairs(target_items) do
            local inv_item = redis.call('HGET', target_inv_key, item.instance_id)
            local parsed = cjson.decode(inv_item)

            if parsed.quantity <= item.quantity then
                redis.call('HDEL', target_inv_key, item.instance_id)
            else
                parsed.quantity = parsed.quantity - item.quantity
                redis.call('HSET', target_inv_key, item.instance_id,
                    cjson.encode(parsed))
            end

            -- Add to initiator
            local new_instance_id = item.instance_id .. '_t'
            local new_item = {
                instance_id = new_instance_id,
                item_id = item.item_id,
                quantity = item.quantity,
                acquired_at = tonumber(ARGV[1]),
                metadata = parsed.metadata or {}
            }
            redis.call('HSET', initiator_inv_key, new_instance_id,
                cjson.encode(new_item))
        end

        -- Mark trade as completed
        redis.call('HSET', trade_key, 'status', 'completed')

        return cjson.encode({
            success = true,
            initiator_received = #target_items,
            target_received = #initiator_items
        })
        """

        trade_data = self.redis.hgetall(trade_key)
        initiator_id = trade_data[b"initiator_id"].decode()
        target_id = trade_data[b"target_id"].decode()

        result = self.redis.eval(
            lua_script,
            3,
            trade_key,
            self.keys.player_inventory(initiator_id),
            self.keys.player_inventory(target_id),
            time.time()
        )

        parsed_result = json.loads(result)

        if parsed_result.get("success"):
            # Clean up trade session
            self.redis.delete(self.keys.player_active_trade(initiator_id))
            self.redis.delete(self.keys.player_active_trade(target_id))

            # Notify both players
            for player in [initiator_id, target_id]:
                self.redis.publish(
                    f"player:{player}:notifications",
                    json.dumps({"type": "trade_completed", "trade_id": trade_id})
                )

        return parsed_result

    def cancel_trade(self, trade_id: str, player_id: str) -> Dict:
        """Cancel an active trade."""
        trade_key = self.keys.trade_session(trade_id)
        trade_data = self.redis.hgetall(trade_key)

        if not trade_data:
            return {"success": False, "error": "Trade not found"}

        initiator_id = trade_data[b"initiator_id"].decode()
        target_id = trade_data[b"target_id"].decode()

        if player_id not in [initiator_id, target_id]:
            return {"success": False, "error": "Not part of this trade"}

        # Clean up
        pipe = self.redis.pipeline()
        pipe.hset(trade_key, "status", TradeStatus.CANCELLED.value)
        pipe.delete(self.keys.player_active_trade(initiator_id))
        pipe.delete(self.keys.player_active_trade(target_id))
        pipe.execute()

        # Notify other player
        other_player = target_id if player_id == initiator_id else initiator_id
        self.redis.publish(
            f"player:{other_player}:notifications",
            json.dumps({
                "type": "trade_cancelled",
                "trade_id": trade_id,
                "cancelled_by": player_id
            })
        )

        return {"success": True}
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class InventorySystem {
    constructor(redisConfig) {
        this.redis = new Redis(redisConfig);
        this.maxSlots = 100;
    }

    // Add item to inventory with stacking support
    async addItem(playerId, itemId, quantity = 1, metadata = {}) {
        const inventoryKey = `player:${playerId}:inventory`;
        const itemDef = await this.getItemDefinition(itemId);

        if (!itemDef) {
            return { success: false, error: 'Item not found' };
        }

        const maxStack = parseInt(itemDef.maxStack) || 1;

        const luaScript = `
            local inventoryKey = KEYS[1]
            local itemId = ARGV[1]
            local quantity = tonumber(ARGV[2])
            local maxStack = tonumber(ARGV[3])
            local maxSlots = tonumber(ARGV[4])
            local metadata = ARGV[5]
            local timestamp = tonumber(ARGV[6])
            local instanceBase = ARGV[7]

            local inventory = redis.call('HGETALL', inventoryKey)
            local existingStacks = {}
            local slotCount = 0

            for i = 1, #inventory, 2 do
                slotCount = slotCount + 1
                local slotData = cjson.decode(inventory[i + 1])

                if slotData.itemId == itemId and slotData.quantity < maxStack then
                    table.insert(existingStacks, {
                        slotId = inventory[i],
                        data = slotData
                    })
                end
            end

            local remaining = quantity
            local addedTo = {}

            -- Fill existing stacks
            for _, stack in ipairs(existingStacks) do
                if remaining <= 0 then break end

                local canAdd = maxStack - stack.data.quantity
                local toAdd = math.min(canAdd, remaining)

                stack.data.quantity = stack.data.quantity + toAdd
                remaining = remaining - toAdd

                redis.call('HSET', inventoryKey, stack.slotId,
                    cjson.encode(stack.data))

                table.insert(addedTo, {
                    slotId = stack.slotId,
                    added = toAdd
                })
            end

            -- Create new stacks
            local newStackCount = 0
            while remaining > 0 and slotCount < maxSlots do
                newStackCount = newStackCount + 1
                local instanceId = instanceBase .. '_' .. tostring(newStackCount)
                local toAdd = math.min(maxStack, remaining)

                local newStack = {
                    instanceId = instanceId,
                    itemId = itemId,
                    quantity = toAdd,
                    acquiredAt = timestamp,
                    metadata = cjson.decode(metadata)
                }

                redis.call('HSET', inventoryKey, instanceId,
                    cjson.encode(newStack))

                table.insert(addedTo, {
                    slotId = instanceId,
                    added = toAdd,
                    newStack = true
                })

                remaining = remaining - toAdd
                slotCount = slotCount + 1
            end

            return cjson.encode({
                success = remaining == 0,
                added = quantity - remaining,
                overflow = remaining,
                stacks = addedTo
            })
        `;

        const result = await this.redis.eval(
            luaScript,
            1,
            inventoryKey,
            itemId,
            quantity,
            maxStack,
            this.maxSlots,
            JSON.stringify(metadata),
            Date.now(),
            uuidv4().substring(0, 8)
        );

        return JSON.parse(result);
    }

    // Remove item from inventory
    async removeItem(playerId, itemId, quantity = 1) {
        const inventoryKey = `player:${playerId}:inventory`;

        const luaScript = `
            local inventoryKey = KEYS[1]
            local itemId = ARGV[1]
            local quantity = tonumber(ARGV[2])

            local inventory = redis.call('HGETALL', inventoryKey)
            local stacks = {}
            local totalAvailable = 0

            for i = 1, #inventory, 2 do
                local slotData = cjson.decode(inventory[i + 1])
                if slotData.itemId == itemId then
                    table.insert(stacks, {
                        slotId = inventory[i],
                        data = slotData
                    })
                    totalAvailable = totalAvailable + slotData.quantity
                end
            end

            if totalAvailable < quantity then
                return cjson.encode({
                    success = false,
                    error = "Insufficient quantity",
                    available = totalAvailable
                })
            end

            local remaining = quantity

            for _, stack in ipairs(stacks) do
                if remaining <= 0 then break end

                local toRemove = math.min(stack.data.quantity, remaining)
                stack.data.quantity = stack.data.quantity - toRemove
                remaining = remaining - toRemove

                if stack.data.quantity <= 0 then
                    redis.call('HDEL', inventoryKey, stack.slotId)
                else
                    redis.call('HSET', inventoryKey, stack.slotId,
                        cjson.encode(stack.data))
                end
            end

            return cjson.encode({
                success = true,
                removed = quantity
            })
        `;

        const result = await this.redis.eval(
            luaScript,
            1,
            inventoryKey,
            itemId,
            quantity
        );

        return JSON.parse(result);
    }

    // Get player inventory
    async getInventory(playerId) {
        const inventoryKey = `player:${playerId}:inventory`;
        const rawInventory = await this.redis.hgetall(inventoryKey);

        const items = [];

        for (const [slotId, itemData] of Object.entries(rawInventory)) {
            const item = JSON.parse(itemData);
            const itemDef = await this.getItemDefinition(item.itemId);

            items.push({
                ...item,
                definition: itemDef
            });
        }

        return {
            playerId,
            items,
            slotCount: items.length,
            maxSlots: this.maxSlots
        };
    }

    // Transfer item between players (atomic)
    async transferItem(fromPlayerId, toPlayerId, instanceId, quantity = 1) {
        const fromKey = `player:${fromPlayerId}:inventory`;
        const toKey = `player:${toPlayerId}:inventory`;

        const luaScript = `
            local fromKey = KEYS[1]
            local toKey = KEYS[2]
            local instanceId = ARGV[1]
            local quantity = tonumber(ARGV[2])
            local timestamp = tonumber(ARGV[3])

            -- Get source item
            local itemJson = redis.call('HGET', fromKey, instanceId)
            if not itemJson then
                return cjson.encode({success = false, error = "Item not found"})
            end

            local item = cjson.decode(itemJson)

            if item.quantity < quantity then
                return cjson.encode({
                    success = false,
                    error = "Insufficient quantity"
                })
            end

            -- Remove from source
            if item.quantity <= quantity then
                redis.call('HDEL', fromKey, instanceId)
            else
                item.quantity = item.quantity - quantity
                redis.call('HSET', fromKey, instanceId, cjson.encode(item))
            end

            -- Add to destination
            local newInstanceId = instanceId .. '_tr_' .. tostring(timestamp)
            local transferredItem = {
                instanceId = newInstanceId,
                itemId = item.itemId,
                quantity = quantity,
                acquiredAt = timestamp,
                metadata = item.metadata or {}
            }

            redis.call('HSET', toKey, newInstanceId,
                cjson.encode(transferredItem))

            return cjson.encode({
                success = true,
                transferred = quantity,
                newInstanceId = newInstanceId
            })
        `;

        const result = await this.redis.eval(
            luaScript,
            2,
            fromKey,
            toKey,
            instanceId,
            quantity,
            Date.now()
        );

        return JSON.parse(result);
    }

    // Get item definition
    async getItemDefinition(itemId) {
        const data = await this.redis.hgetall(`items:def:${itemId}`);
        if (!data || Object.keys(data).length === 0) {
            return null;
        }
        return data;
    }
}

// Usage
const inventory = new InventorySystem({ host: 'localhost', port: 6379 });

// Add items
await inventory.addItem('player123', 'health_potion', 5);

// Get inventory
const inv = await inventory.getInventory('player123');
console.log(inv);

// Remove items
await inventory.removeItem('player123', 'health_potion', 2);

// Transfer between players
await inventory.transferItem('player123', 'player456', 'instance_abc', 1);
```

## Best Practices

1. **Use Lua scripts** for all inventory operations to ensure atomicity and prevent item duplication.

2. **Validate on server** - Never trust client-reported inventory state. Always verify server-side.

3. **Log all transactions** - Keep an audit trail of all inventory changes for debugging and fraud detection.

4. **Implement rate limiting** - Prevent abuse of trade and transfer systems.

5. **Use optimistic locking** for trades - WATCH keys to detect concurrent modifications.

6. **Set appropriate TTLs** on trade sessions to prevent abandoned trades from lingering.

7. **Test edge cases** - Empty inventory, full inventory, partial stacks, concurrent trades.

## Conclusion

Redis provides an excellent foundation for building inventory systems. Its atomic operations, Lua scripting, and hash data structures make it ideal for handling the complex transactional nature of item management. The key is using atomic operations to prevent item duplication or loss, especially during trades and transfers.

For more gaming patterns with Redis, check out our guides on [Achievement Systems](/blog/redis-achievement-systems) and [Game State Management](/blog/redis-game-state-management).
