import React from 'react';
import { ChevronRight, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

const NodeDetails = ({ node, edges, onClose }) => {
    if (!node) return null;

  const outgoingCalls = edges.filter(e => e.source.id === node.id);
  const incomingCalls = edges.filter(e => e.target.id === node.id);

  const buildCallTree = (nodeId, visited = new Set(), depth = 0) => {
    if (depth > 3 || visited.has(nodeId)) return [];
    visited.add(nodeId);

    const childCalls = edges.filter(e => e.source.id === nodeId);
    return childCalls.map(call => ({
      id: call.target.id,
      label: nodes.find(n => n.id === call.target.id)?.label || call.target.id,
      children: buildCallTree(call.target.id, new Set(visited), depth + 1)
    }));
  };

  const callTree = buildCallTree(node.id);

  const TreeNode = ({ node, depth = 0 }) => (
    <div className="ml-4">
      <div className="flex items-center gap-2 py-1">
        {node.children.length > 0 && <ChevronRight size={16} />}
        <span className="text-sm">{node.label || node.id}</span>
      </div>
      {node.children.map((child, index) => (
        <TreeNode key={`${child.id}-${index}`} node={child} depth={depth + 1} />
      ))}
    </div>
  );


  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">{node.label || node.id}</CardTitle>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X size={20} />
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Outgoing Calls</div>
                <div className="text-lg font-medium">{outgoingCalls.length}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Incoming Calls</div>
                <div className="text-lg font-medium">{incomingCalls.length}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Call Tree</h3>
            <div className="bg-gray-50 p-3 rounded max-h-96 overflow-auto">
              <div className="font-medium mb-2">{node.id}</div>
              {callTree.map((child, index) => (
                <TreeNode key={`${child.id}-${index}`} node={child} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Called By</h3>
            <div className="bg-gray-50 p-3 rounded max-h-48 overflow-auto">
              {incomingCalls.length > 0 ? (
                <ul className="space-y-1">
                  {incomingCalls.map((call, index) => (
                    <li key={index} className="text-sm">{call.source.id}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-500">No incoming calls</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NodeDetails;