import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";


const OptimizedChordDiagram = ({ nodes, edges }) => {
  const svgRef = useRef(null);
  const [threshold, setThreshold] = useState(50); // Show top 50 functions by default

  useEffect(() => {
    if (!nodes.length || !edges.length) return;

    // Get the most connected functions
    const functionCalls = {};
    edges.forEach(edge => {
      const source = edge.source.id || edge.source;
      const target = edge.target.id || edge.target;
      functionCalls[source] = (functionCalls[source] || 0) + 1;
      functionCalls[target] = (functionCalls[target] || 0) + 1;
    });

    // Get top N functions
    const topFunctions = Object.entries(functionCalls)
      .sort(([, a], [, b]) => b - a)
      .slice(0, threshold)
      .map(([id]) => id);

    // Filter nodes and edges
    const filteredNodes = nodes.filter(node => topFunctions.includes(node.id));
    const filteredEdges = edges.filter(edge => {
      const source = edge.source.id || edge.source;
      const target = edge.target.id || edge.target;
      return topFunctions.includes(source) && topFunctions.includes(target);
    });

    // Create matrix for chord diagram
    const index = new Map(filteredNodes.map((node, i) => [node.id, i]));
    const matrix = Array(filteredNodes.length).fill().map(() => Array(filteredNodes.length).fill(0));
    
    filteredEdges.forEach(edge => {
      const source = index.get(edge.source.id || edge.source);
      const target = index.get(edge.target.id || edge.target);
      if (source !== undefined && target !== undefined) {
        matrix[source][target] += 1;
      }
    });

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Setup dimensions
    const width = 800;
    const height = 800;
    const innerRadius = Math.min(width, height) * 0.3;
    const outerRadius = innerRadius + 20;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [-width / 2, -height / 2, width, height]);

    // Create the chord layout
    const chord = d3.chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending)
      (matrix);

    // Add the groups
    const group = svg.append("g")
      .selectAll("g")
      .data(chord.groups)
      .join("g");

    // Add arcs
    group.append("path")
      .attr("fill", d => d3.interpolateBlues(d.value / matrix.length))
      .attr("d", d3.arc().innerRadius(innerRadius).outerRadius(outerRadius));

    // Add labels
    group.append("text")
      .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", "0.35em")
      .attr("transform", d => `
        rotate(${(d.angle * 180 / Math.PI - 90)})
        translate(${outerRadius + 10})
        ${d.angle > Math.PI ? "rotate(180)" : ""}
      `)
      .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
      .attr("font-size", "8px")
      .text(d => {
        const name = filteredNodes[d.index].id;
        return name.length > 30 ? name.slice(0, 27) + '...' : name;
      });

    // Add the links
    svg.append("g")
      .attr("fill-opacity", 0.5)
      .selectAll("path")
      .data(chord)
      .join("path")
      .attr("d", d3.ribbon().radius(innerRadius))
      .attr("fill", d => d3.interpolateBlues(0.8))
      .attr("stroke", d => d3.rgb(d3.interpolateBlues(0.8)).darker());

    // Add tooltips
    group.append("title")
      .text(d => `${filteredNodes[d.index].id}\nTotal Calls: ${d.value}`);

  }, [nodes, edges, threshold]);

  return (
    <Dialog className="w-full max-w-4xl mx-auto my-4">
      <DialogHeader className="flex flex-row items-center justify-between">
        <DialogTitle>Top Function Relationships</DialogTitle>
        <select
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="px-3 py-1 border rounded-md"
        >
          <option value={25}>Top 25</option>
          <option value={50}>Top 50</option>
          <option value={100}>Top 100</option>
        </select>
      </DialogHeader>
      <DialogContent>
        <div className="aspect-square">
          <svg ref={svgRef} width="100%" height="100%" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OptimizedChordDiagram;