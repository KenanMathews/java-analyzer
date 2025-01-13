import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";

const FunctionTreemap = ({ nodes, edges }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!nodes.length || !edges.length) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Process data into hierarchical structure
    const processData = () => {
      const callCounts = {};
      edges.forEach(edge => {
        const sourceId = edge.source.id || edge.source;
        const targetId = edge.target.id || edge.target;
        
        callCounts[sourceId] = (callCounts[sourceId] || 0) + 1;
        callCounts[targetId] = (callCounts[targetId] || 0) + 1;
      });

      // Create hierarchical structure based on namespaces/folders
      const root = {
        name: "root",
        children: []
      };

      nodes.forEach(node => {
        const parts = node.id.split('/');
        let current = root;

        parts.forEach((part, i) => {
          if (i === parts.length - 1) {
            // Leaf node (actual function)
            current.children.push({
              name: part,
              value: callCounts[node.id] || 1
            });
          } else {
            // Directory/namespace
            let child = current.children.find(c => c.name === part);
            if (!child) {
              child = { name: part, children: [] };
              current.children.push(child);
            }
            current = child;
          }
        });
      });

      return root;
    };

    const data = processData();
    const width = 800;
    const height = 600;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    const root = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    d3.treemap()
      .size([width, height])
      .padding(1)
      (root);

    const leaf = svg.selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    leaf.append("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => d3.interpolatePurples(d.value / root.value));

    leaf.append("text")
      .selectAll("tspan")
      .data(d => {
        const name = d.data.name;
        return name.length < 20 ? [name] : [name.slice(0, 17) + "..."];
      })
      .join("tspan")
      .attr("x", 3)
      .attr("y", (d, i) => `${(i + 1) * 10}`)
      .attr("fill", "white")
      .text(d => d)
      .style("font-size", "8px");

    // Add tooltips
    leaf.append("title")
      .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\nCalls: ${d.value}`);

  }, [nodes, edges]);

  return (
    <Dialog className="w-full max-w-4xl mx-auto my-4">
      <DialogHeader>
        <DialogTitle>Function Call Distribution</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div style={{ height: '600px' }}>
          <svg ref={svgRef} width="100%" height="100%" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FunctionTreemap;