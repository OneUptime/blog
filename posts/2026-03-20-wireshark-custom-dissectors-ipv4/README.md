# How to Build Custom Wireshark Dissectors for Proprietary IPv4 Protocols

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, Lua, Dissector, IPv4, Protocol Analysis, Custom Protocol

Description: Write Lua-based Wireshark dissectors to decode proprietary application protocols running over IPv4 TCP or UDP, enabling structured analysis in Wireshark's packet view.

## Introduction

Wireshark includes dissectors for hundreds of standard protocols, but proprietary or custom application protocols appear as raw bytes. Writing a Lua dissector adds named field decoding, filter support, and tree display - transforming incomprehensible hex into readable protocol details.

## Example Protocol

We'll dissect a simple proprietary sensor protocol over UDP:

```text
Packet format:
  [4 bytes: magic = 0xDEADBEEF]
  [1 byte:  message type (0=ping, 1=data, 2=ack)]
  [2 bytes: sequence number (big-endian)]
  [4 bytes: sensor ID (big-endian)]
  [4 bytes: value (float32, big-endian)]
  [1 byte:  checksum (XOR of all previous bytes)]
```

## Writing the Lua Dissector

Save this as `~/.local/lib/wireshark/plugins/sensor_proto.lua` on Linux/macOS (or `%APPDATA%\Wireshark\plugins\` on Windows):

```lua
-- sensor_proto.lua
-- Dissector for the Sensor Telemetry Protocol over UDP port 9999

-- Create the protocol object
local sensor_proto = Proto("SENSOR", "Sensor Telemetry Protocol")

-- Define the protocol fields
local f_magic    = ProtoField.uint32("sensor.magic",    "Magic",       base.HEX)
local f_msgtype  = ProtoField.uint8 ("sensor.msgtype",  "Message Type",base.DEC, {
    [0] = "Ping",
    [1] = "Data",
    [2] = "ACK"
})
local f_seqnum   = ProtoField.uint16("sensor.seqnum",   "Sequence Number", base.DEC)
local f_sensorid = ProtoField.uint32("sensor.sensorid", "Sensor ID",   base.DEC)
local f_value    = ProtoField.float ("sensor.value",    "Sensor Value")
local f_checksum = ProtoField.uint8 ("sensor.checksum", "Checksum",    base.HEX)

-- Register the fields with the protocol
sensor_proto.fields = {
    f_magic, f_msgtype, f_seqnum, f_sensorid, f_value, f_checksum
}

-- Expert info fields for errors
local e_bad_magic    = ProtoExpert.new("sensor.bad_magic",    "Invalid magic number",
                                       expert.group.MALFORMED, expert.severity.ERROR)
local e_bad_checksum = ProtoExpert.new("sensor.bad_checksum", "Checksum mismatch",
                                       expert.group.CHECKSUM,  expert.severity.WARN)
sensor_proto.experts = { e_bad_magic, e_bad_checksum }

-- The dissector function: called for each packet
function sensor_proto.dissector(buffer, pinfo, tree)
    local length = buffer:len()
    
    -- Minimum packet size check
    if length < 16 then
        return 0  -- Not our protocol - too short
    end
    
    -- Check magic number
    local magic = buffer(0, 4):uint()
    if magic ~= 0xDEADBEEF then
        return 0  -- Not our protocol
    end
    
    -- Set the protocol column in the packet list
    pinfo.cols.protocol = "SENSOR"
    
    -- Create a subtree for this protocol
    local subtree = tree:add(sensor_proto, buffer(), "Sensor Telemetry Protocol")
    
    -- Add fields to the tree
    subtree:add(f_magic,    buffer(0,  4))
    subtree:add(f_msgtype,  buffer(4,  1))
    subtree:add(f_seqnum,   buffer(5,  2))
    subtree:add(f_sensorid, buffer(7,  4))
    subtree:add(f_value,    buffer(11, 4))
    local checksum_item = subtree:add(f_checksum, buffer(15, 1))
    
    -- Parse fields for the info column
    local msgtype  = buffer(4,  1):uint()
    local seqnum   = buffer(5,  2):uint()
    local sensorid = buffer(7,  4):uint()
    local value    = buffer(11, 4):float()
    
    -- Validate magic
    if magic ~= 0xDEADBEEF then
        subtree:add_proto_expert_info(e_bad_magic)
    end
    
    -- Validate checksum
    local computed_xor = 0
    for i = 0, 14 do
        computed_xor = bit.bxor(computed_xor, buffer(i, 1):uint())
    end
    local received_checksum = buffer(15, 1):uint()
    if computed_xor ~= received_checksum then
        checksum_item:add_proto_expert_info(e_bad_checksum,
            string.format("Checksum mismatch: expected 0x%02X, got 0x%02X",
                          computed_xor, received_checksum))
    end
    
    -- Build the info column
    local msg_names = {[0]="Ping", [1]="Data", [2]="ACK"}
    local msg_name = msg_names[msgtype] or "Unknown"
    pinfo.cols.info = string.format("%s seq=%d sensor=%d value=%.2f",
                                    msg_name, seqnum, sensorid, value)
    
    return length  -- Return number of bytes consumed
end

-- Register the dissector for UDP port 9999
local udp_table = DissectorTable.get("udp.port")
udp_table:add(9999, sensor_proto)

-- Also support heuristic detection
local function heuristic_checker(buffer, pinfo, tree)
    if buffer:len() < 4 then return false end
    if buffer(0, 4):uint() == 0xDEADBEEF then
        sensor_proto.dissector(buffer, pinfo, tree)
        return true
    end
    return false
end

sensor_proto:register_heuristic("udp", heuristic_checker)
```

## Installing and Enabling the Dissector

1. Save the file to `~/.local/lib/wireshark/plugins/sensor_proto.lua`
2. Restart Wireshark
3. Go to **Help > About Wireshark > Plugins** to verify it loaded

## Using the Dissector

Once installed:

```wireshark
# Filter for your protocol

sensor

# Filter by specific field
sensor.sensorid == 42
sensor.value > 100.0
sensor.msgtype == 1

# Show checksum errors
sensor.bad_checksum
```

## Testing with tshark

```bash
# Decode a pcap file using the Lua plugin
tshark -r sensor_capture.pcap \
  -X lua_script:sensor_proto.lua \
  -T fields \
  -e sensor.sensorid \
  -e sensor.value \
  -e sensor.msgtype
```

## Conclusion

Lua dissectors in Wireshark transform proprietary protocols from raw hex into structured, filterable data. The key steps are: define `ProtoField` objects for each field, implement the `dissector` function to parse the buffer, and register against the appropriate port or use heuristic detection for dynamic protocols.
