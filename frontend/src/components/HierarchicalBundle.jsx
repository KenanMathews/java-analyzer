import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";


const HierarchicalBundle = ({ nodes, edges }) => {
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [processedNodes, setProcessedNodes] = useState([]);
  
  useEffect(() => {
    if (!nodes.length || !edges.length) return;

    // Process data into hierarchical structure
    const processData = () => {
      const nodeMap = new Map(nodes.map(node => [node.id, { ...node, imports: [] }]));
      
      // Build imports list
      edges.forEach(edge => {
        const source = edge.source.id || edge.source;
        const target = edge.target.id || edge.target;
        const sourceNode = nodeMap.get(source);
        if (sourceNode) {
          sourceNode.imports.push(target);
        }
      });

      // Create hierarchical structure
      const root = {
        name: "root",
        children: []
      };

      // Group by directories/namespaces
      nodeMap.forEach((node, id) => {
        const parts = id.split('/');
        let current = root;

        parts.slice(0, -1).forEach(part => {
          let child = current.children.find(c => c.name === part);
          if (!child) {
            child = { name: part, children: [] };
            current.children.push(child);
          }
          current = child;
        });

        current.children.push({
          name: parts[parts.length - 1],
          imports: node.imports,
          size: 1
        });
      });

      return root;
    };

    const data = processData();
    const width = 960;
    const height = 960;
    const radius = width / 2;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [-width / 2, -height / 2, width, height]);

    // Create cluster layout
    const cluster = d3.cluster()
      .size([2 * Math.PI, radius - 100]);

    const root = d3.hierarchy(data);
    cluster(root);

    // Create the links
    const line = d3.lineRadial()
      .curve(d3.curveBundle.beta(0.85))
      .radius(d => d.y)
      .angle(d => d.x);

    const nodeById = new Map(root.leaves().map(d => [d.data.name, d]));
    const links = [];
    
    root.leaves().forEach(leaf => {
      const source = leaf;
      (leaf.data.imports || []).forEach(targetId => {
        const target = nodeById.get(targetId.split('/').pop());
        if (target) {
          links.push({
            source: [source.x, source.y],
            target: [target.x, target.y]
          });
        }
      });
    });

    // Draw the links
    svg.append("g")
      .attr("stroke", "#ccc")
      .attr("fill", "none")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d", d => line(
        [
          { x: d.source[0], y: d.source[1] },
          { x: d.target[0], y: d.target[1] }
        ]
      ))
      .attr("opacity", 0.2);

    // Draw the nodes
    const leafNodes = svg.append("g")
      .selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
      .append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d.x < Math.PI ? 6 : -6)
      .attr("text-anchor", d => d.x < Math.PI ? "start" : "end")
      .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
      .attr("font-size", "8px")
      .text(d => d.data.name)
      .attr("fill", "#666")
      .each(function(d) {
        d.text = this;
      })
      .on("mouseover", function(event, d) {
        setSelectedNode(d);
        d3.select(this).attr("font-weight", "bold");
      })
      .on("mouseout", function(event, d) {
        setSelectedNode(null);
        d3.select(this).attr("font-weight", "normal");
      });

    setProcessedNodes(root.leaves());
  }, [nodes, edges]);

  return (
    <Dialog className="w-full max-w-5xl mx-auto my-4">
      <DialogHeader>
        <DialogTitle>Function Call Hierarchy</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="aspect-square">
          <svg ref={svgRef} width="100%" height="100%" />
        </div>
        {selectedNode && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium">{selectedNode.data.name}</h3>
            <p className="text-sm text-gray-600">
              Calls {selectedNode.data.imports?.length || 0} other functions
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HierarchicalBundle;