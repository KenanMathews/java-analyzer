import React from 'react';
import { Dialog, DialogHeader, DialogContent, DialogTitle} from './ui/Dialog';

const CallHeatmap = ({ nodes, edges }) => {
  // Process data for the heatmap
  const processData = () => {
    const callCounts = {};
    nodes.forEach(node => {
      callCounts[node.id] = {
        incoming: 0,
        outgoing: 0
      };
    });

    edges.forEach(edge => {
      const sourceId = edge.source.id || edge.source;
      const targetId = edge.target.id || edge.target;
      
      callCounts[sourceId].outgoing += 1;
      callCounts[targetId].incoming += 1;
    });

    return Object.entries(callCounts)
      .map(([id, counts]) => ({
        id,
        ...counts,
        total: counts.incoming + counts.outgoing
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20); // Show top 20 functions
  };

  const data = processData();
  const maxCalls = Math.max(...data.map(d => Math.max(d.incoming, d.outgoing)));

  // Get color based on call count
  const getColor = (count) => {
    const intensity = Math.min(count / maxCalls, 1);
    return `rgb(${Math.round(233 * (1 - intensity))}, ${Math.round(216 * (1 - intensity))}, ${Math.round(253 * (1 - intensity))})`;
  };

  return (
    <Dialog className="w-full max-w-2xl mx-auto my-4">
      <DialogHeader>
        <DialogTitle>Top 20 Functions by Call Volume</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-2">Function</th>
                <th className="text-center p-2 w-32">Incoming</th>
                <th className="text-center p-2 w-32">Outgoing</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="p-2 truncate max-w-xs" title={item.id}>
                    {item.id}
                  </td>
                  <td 
                    className="p-2"
                    style={{ backgroundColor: getColor(item.incoming) }}
                  >
                    <div className="text-center">{item.incoming}</div>
                  </td>
                  <td 
                    className="p-2"
                    style={{ backgroundColor: getColor(item.outgoing) }}
                  >
                    <div className="text-center">{item.outgoing}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallHeatmap;