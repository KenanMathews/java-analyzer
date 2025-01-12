import React, { useEffect, useRef, useState } from "react";
import { Search, AlertCircle, ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";
import * as d3 from "d3";
import _ from "lodash";
import {Dialog,DialogContent, DialogHeader,DialogTitle,} from "./ui/Dialog";
import { Card, CardContent } from "./ui/card";

const NetworkDiagram = () => {
  const canvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [nodeFilter, setNodeFilter] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedNodeData, setSelectedNodeData] = useState(null);
  const [error, setError] = useState(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredPosition, setHoveredPosition] = useState({ x: 0, y: 0 });
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  const [nodeDegrees, setNodeDegrees] = useState({});
  const [showControls, setShowControls] = useState(true);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.nodes || !data.links) {
        throw new Error('Invalid JSON structure');
      }

      const degrees = {};
      data.links.forEach(link => {
        degrees[link.source] = (degrees[link.source] || 0) + 1;
        degrees[link.target] = (degrees[link.target] || 0) + 1;
      });

      setNodeDegrees(degrees);
      setNodes(data.nodes);
      setEdges(data.links);
      setStats({
        nodes: data.nodes.length,
        edges: data.links.length
      });
    } catch (err) {
      setError('Error processing file: ' + err.message);
    }
  };

  useEffect(() => {
    if (!nodes.length || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const width = canvas.width;
    const height = canvas.height;

    // Scale for node sizes
    const maxDegree = Math.max(...Object.values(nodeDegrees));
    const radiusScale = d3.scaleSqrt()
      .domain([1, maxDegree])
      .range([2, 8]);

    // Using a more vibrant color scale
    const colorScale = d3.scaleSequential()
      .domain([0, maxDegree])
      .interpolator(d3.interpolatePurples);

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges)
        .id(d => d.id)
        .distance(30))
      .force('charge', d3.forceManyBody()
        .strength(-30)
        .theta(0.8)
        .distanceMax(150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .alphaDecay(0.01)
      .velocityDecay(0.3);

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        setTransform(event.transform);
        render();
      });

    d3.select(canvas).call(zoom);

    const findNodeUnderMouse = (mouseX, mouseY) => {
      const transform = d3.zoomTransform(canvas);
      return nodes.find(node => {
        const x = transform.applyX(node.x);
        const y = transform.applyY(node.y);
        const radius = radiusScale(nodeDegrees[node.id] || 1);
        return Math.hypot(x - mouseX, y - mouseY) < radius;
      });
    };

    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const node = findNodeUnderMouse(mouseX, mouseY);
      
      if (node) {
        setHoveredNode(node);
        setHoveredPosition({ x: event.clientX, y: event.clientY });
        canvas.style.cursor = 'pointer';
      } else {
        setHoveredNode(null);
        canvas.style.cursor = 'default';
      }
    });

    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const node = findNodeUnderMouse(mouseX, mouseY);
      if (node) {
        setSelectedNode(selectedNode === node.id ? null : node.id);
        setSelectedNodeData(selectedNode === node.id ? null : node);
      }
    });

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      
      const transform = d3.zoomTransform(canvas);
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      // Draw edges
      ctx.strokeStyle = '#6b7280';
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      edges.forEach(edge => {
        const source = nodes[edge.source.index];
        const target = nodes[edge.target.index];
        if (source && target) {
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
        }
      });
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Draw nodes with outline
      nodes.forEach(node => {
        const radius = radiusScale(nodeDegrees[node.id] || 1);
        ctx.beginPath();
        ctx.fillStyle = colorScale(nodeDegrees[node.id] || 0);
        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = 0.5;
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        if (node.id === selectedNode || node === hoveredNode) {
          ctx.strokeStyle = '#7c3aed';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      ctx.restore();
    };

    simulation.on('tick', () => {
      render();
    });

    return () => {
      simulation.stop();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [nodes, edges, selectedNode, nodeDegrees]);

  const filteredNodes = nodes.filter(node => 
    node.id.toLowerCase().includes(nodeFilter.toLowerCase()) ||
    (node.label && node.label.toLowerCase().includes(nodeFilter.toLowerCase()))
  );

  return (
    <div className="w-full h-screen relative">
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 text-red-500 px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full bg-gray-50"
      />

      {/* Floating Controls Panel */}
      <div className="absolute top-4 left-4 z-50">
        <Card className="w-72">
          <CardContent className="p-4">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="block w-full text-sm mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />

            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search functions..."
                value={nodeFilter}
                onChange={(e) => setNodeFilter(e.target.value)}
                className="w-full p-2 pr-10 border rounded-lg"
              />
              <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  const canvas = canvasRef.current;
                  const zoom = d3.zoom().transform;
                  d3.select(canvas).transition().call(
                    zoom,
                    d3.zoomIdentity.scale(transform.k * 1.2)
                  );
                }}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200"
              >
                <ZoomIn size={20} />
              </button>
              <button
                onClick={() => {
                  const canvas = canvasRef.current;
                  const zoom = d3.zoom().transform;
                  d3.select(canvas).transition().call(
                    zoom,
                    d3.zoomIdentity.scale(transform.k / 1.2)
                  );
                }}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200"
              >
                <ZoomOut size={20} />
              </button>
              <button
                onClick={() => {
                  const canvas = canvasRef.current;
                  d3.select(canvas).transition().call(
                    d3.zoom().transform,
                    d3.zoomIdentity
                  );
                }}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200"
              >
                <RotateCcw size={20} />
              </button>
            </div>

            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>Total Functions:</span>
                <span className="font-medium">{stats.nodes}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Calls:</span>
                <span className="font-medium">{stats.edges}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Function List Panel */}
      <div className="absolute top-4 right-4 z-50">
        <Card className="w-72">
          <CardContent className="p-4">
            <div className="max-h-96 overflow-y-auto">
              <div className="text-sm font-medium mb-2 text-gray-700">
                Functions ({filteredNodes.length})
              </div>
              <div className="space-y-1">
                {filteredNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      setSelectedNode(selectedNode === node.id ? null : node.id);
                      setSelectedNodeData(selectedNode === node.id ? null : node);
                    }}
                    className={`w-full text-left p-2 rounded text-sm ${
                      selectedNode === node.id
                        ? "bg-purple-100 text-purple-800"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {node.label || node.id}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none"
          style={{
            left: hoveredPosition.x + 10,
            top: hoveredPosition.y - 10,
          }}
        >
          <div className="font-medium">{hoveredNode.label || hoveredNode.id}</div>
          <div className="text-gray-300 text-xs mt-1">
            Total Calls: {nodeDegrees[hoveredNode.id] || 0}
          </div>
        </div>
      )}

      {/* Node Details Dialog */}
      <Dialog open={!!selectedNodeData} onOpenChange={() => setSelectedNodeData(null)}>
        <DialogContent className="bg-white">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {selectedNodeData?.label || selectedNodeData?.id}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 mb-1">Outgoing Calls</div>
              <div className="text-2xl font-semibold text-purple-900">
                {selectedNodeData?.statistics?.outgoingCalls || 0}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 mb-1">Incoming Calls</div>
              <div className="text-2xl font-semibold text-purple-900">
                {selectedNodeData?.statistics?.incomingCalls || 0}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Called By</h3>
            <div className="bg-gray-50 rounded-lg border border-gray-100">
              <div className="max-h-[240px] overflow-y-auto p-3">
                {selectedNodeData?.statistics?.calledBy?.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedNodeData.statistics.calledBy.map((caller, index) => (
                      <li key={index} className="text-sm text-gray-600 py-1 px-2 hover:bg-gray-100 rounded">
                        {caller}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500 py-2">No incoming calls</div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NetworkDiagram;