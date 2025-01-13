import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";

const ChordDiagram = ({ nodes, edges }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!nodes.length || !edges.length) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Setup dimensions
    const width = 600;
    const height = 600;
    const innerRadius = Math.min(width, height) * 0.3;
    const outerRadius = innerRadius + 10;

    // Create the SVG
    const svg = d3.select(svgRef.current)
      .attr("viewBox", [-width / 2, -height / 2, width, height]);

    // Create the matrix
    const index = new Map(nodes.map((node, i) => [node.id, i]));
    const matrix = Array(nodes.length).fill().map(() => Array(nodes.length).fill(0));
    
    edges.forEach(edge => {
      const source = index.get(edge.source.id || edge.source);
      const target = index.get(edge.target.id || edge.target);
      matrix[source][target] += 1;
    });

    // Create the chord layout
    const chord = d3.chord()
      .padAngle(0.04)
      .sortSubgroups(d3.descending)
      (matrix);

    // Add the groups
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const group = svg.append("g")
      .selectAll("g")
      .data(chord.groups)
      .join("g");

    group.append("path")
      .attr("fill", d => d3.interpolatePurples(d.value / nodes.length))
      .attr("d", arc);

    // Add the links
    svg.append("g")
      .attr("fill-opacity", 0.5)
      .selectAll("path")
      .data(chord)
      .join("path")
      .attr("d", d3.ribbon().radius(innerRadius))
      .attr("fill", d => d3.interpolatePurples(0.7))
      .attr("stroke", d => d3.rgb(d3.interpolatePurples(0.7)).darker());

    // Add tooltips
    group.append("title")
      .text(d => `${nodes[d.index].id}\nCalls: ${d.value}`);

  }, [nodes, edges]);

  return (
    <Dialog className="w-full max-w-2xl mx-auto my-4">
      <DialogHeader>
        <DialogTitle>Function Call Relationships</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="aspect-square">
          <svg ref={svgRef} width="100%" height="100%" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChordDiagram;