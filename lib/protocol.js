var Frame = require('./frame')
  , Hand = require('./hand')
  , Pointable = require('./pointable')
  , Finger = require('./finger');

var Event = function(data) {
  this.type = data.type;
  this.state = data.state;
};

var chooseProtocol = exports.chooseProtocol = function(header) {
  var protocol;
  switch(header.version) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      protocol = JSONProtocol(header.version, function(data) {
        return data.event ? new Event(data.event) : new Frame(data);
      });
      protocol.sendBackground = function(connection, state) {
        connection.send(protocol.encode({background: state}));
      }
      protocol.sendFocused = function(connection, state) {
        connection.send(protocol.encode({focused: state}));
      }
      break;
    default:
      throw "unrecognized version";
  }
  return protocol;
}

var JSONProtocol = exports.JSONProtocol = function(version) {
  var protocol = function(data) {
    if (data.event) {
      return new Event(data.event);
    } else {
      var frame = new Frame(data);
      var handMap = {};
      for (var handIdx = 0, handCount = data.hands.length; handIdx != handCount; handIdx++) {
        var hand = new Hand(data.hands[handIdx]);
        hand.frame = frame;
        frame.hands.push(hand);
        frame.handsMap[hand.id] = hand;
        handMap[hand.id] = handIdx;
      }
      for (var pointableIdx = 0, pointableCount = data.pointables.length; pointableIdx != pointableCount; pointableIdx++) {
        var pointableData = data.pointables[pointableIdx];
        var pointable = pointableData.dipPosition ? new Finger(pointableData) : new Pointable(pointableData);
        pointable.frame = frame;
        frame.pointables.push(pointable);
        frame.pointablesMap[pointable.id] = pointable;
        (pointable.tool ? frame.tools : frame.fingers).push(pointable);
        if (pointable.handId !== undefined && handMap.hasOwnProperty(pointable.handId)) {
          var hand = frame.hands[handMap[pointable.handId]];
          hand.pointables.push(pointable);
          (pointable.tool ? hand.tools : hand.fingers).push(pointable);
        }
      }
      return frame;
    }
  };
  protocol.encode = function(message) {
    return JSON.stringify(message);
  }
  protocol.version = version;
  protocol.versionLong = 'Version ' + version;
  protocol.type = 'protocol';
  return protocol;
};
