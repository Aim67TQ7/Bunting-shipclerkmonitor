import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Papa from 'papaparse';
import _ from 'lodash';
import { Camera } from 'lucide-react';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalValue: 0,
    avgValue: 0,
    releasedOrders: 0,
    changesOrders: 0,
    topCountries: []
  });
  const [upcomingReleases, setUpcomingReleases] = useState([]);
  const [ordersByCountry, setOrdersByCountry] = useState([]);
  const [dateDistribution, setDateDistribution] = useState([]);
  const [orderValueRanges, setOrderValueRanges] = useState([]);
  const dashboardRef = useRef(null);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Use fetch API instead of window.fs.readFile for Netlify compatibility
        const response = await fetch('/data/Shipclerkmonitor.csv');
        const text = await response.text();
        
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          trimHeaders: true,
          complete: (results) => {
            processData(results.data);
            setLoading(false);
            setFileUploaded(true);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error reading file:', error);
        setLoading(false);
      }
    };

    // Try to fetch the pre-loaded data
    fetchData();
  }, []);
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoading(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const contents = e.target.result;
        
        Papa.parse(contents, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          trimHeaders: true,
          complete: (results) => {
            processData(results.data);
            setLoading(false);
            setFileUploaded(true);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            setLoading(false);
          }
        });
      };
      
      reader.readAsText(file);
    }
  };
  
  const generatePDF = async () => {
    if (!dashboardRef.current) return;
    
    try {
      // Dynamically import html2canvas and jsPDF
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(dashboardRef.current);
      
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 280;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save('shipclerk_dashboard.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. See console for details.');
    }
  };

  const processData = (rawData) => {
    // Set the original data
    setData(rawData);
    
    // Calculate basic stats
    const totalOrders = rawData.length;
    const orderValues = rawData.map(order => order["Order Amt"] || 0);
    const totalValue = _.sum(orderValues);
    const avgValue = totalValue / totalOrders;
    
    // Count order statuses
    const releasedOrders = rawData.filter(order => order.REL === true).length;
    const changesOrders = rawData.filter(order => order.CH === true).length;
    
    // Get top countries
    const countryCount = _.countBy(rawData, 'Country');
    const topCountries = Object.entries(countryCount)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    setStats({
      totalOrders,
      totalValue,
      avgValue,
      releasedOrders,
      changesOrders,
      topCountries
    });
    
    // Prepare upcoming releases data
    const today = new Date();
    
    const upcoming = rawData
      .filter(order => {
        if (!order.NextRelDt) return false;
        const relDate = new Date(order.NextRelDt);
        return relDate >= today;
      })
      .sort((a, b) => new Date(a.NextRelDt) - new Date(b.NextRelDt))
      .slice(0, 10)
      .map(order => ({
        orderNumber: order.Order,
        company: order.Name,
        releaseDate: order.NextRelDt ? order.NextRelDt.split(' ')[0] : '',
        value: order["Order Amt"] || 0
      }));
    
    setUpcomingReleases(upcoming);
    
    // Prepare orders by country data
    const ordersByCountryData = Object.entries(countryCount)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
    
    setOrdersByCountry(ordersByCountryData);
    
    // Prepare date distribution data
    const dateCount = {};
    rawData.forEach(order => {
      if (order.NextRelDt) {
        const datePart = order.NextRelDt.split(' ')[0];
        dateCount[datePart] = (dateCount[datePart] || 0) + 1;
      }
    });
    
    const dateDistData = Object.entries(dateCount)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 15);
    
    setDateDistribution(dateDistData);
    
    // Prepare order value ranges
    const ranges = [
      { range: '$0-$1K', count: 0 },
      { range: '$1K-$5K', count: 0 },
      { range: '$5K-$10K', count: 0 },
      { range: '$10K-$20K', count: 0 },
      { range: '$20K-$50K', count: 0 },
      { range: '$50K+', count: 0 }
    ];
    
    rawData.forEach(order => {
      const value = order["Order Amt"] || 0;
      if (value < 1000) ranges[0].count++;
      else if (value < 5000) ranges[1].count++;
      else if (value < 10000) ranges[2].count++;
      else if (value < 20000) ranges[3].count++;
      else if (value < 50000) ranges[4].count++;
      else ranges[5].count++;
    });
    
    setOrderValueRanges(ranges);
  };

  // File upload and download section UI
  const renderFileControls = () => {
    return (
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <h2 className="text-lg font-medium mb-2">Upload Shipping Data</h2>
            <div className="flex items-center">
              <label className="bg-blue-500 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded cursor-pointer">
                <span>Choose CSV File</span>
                <input 
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <span className="ml-3 text-sm text-gray-500">
                {fileUploaded ? 'File loaded successfully!' : 'No file chosen'}
              </span>
            </div>
          </div>
          
          <div>
            <button 
              onClick={generatePDF}
              disabled={!fileUploaded}
              className={`flex items-center bg-green-500 hover:bg-green-700 text-white font-medium py-2 px-4 rounded ${!fileUploaded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Camera size={18} className="mr-2" />
              <span>Download Dashboard as PDF</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !fileUploaded) {
    return (
      <div className="p-6 bg-gray-50">
        {renderFileControls()}
        <div className="flex items-center justify-center h-64 bg-white p-4 rounded-lg shadow">
          <p className="text-xl">Upload a file to generate the dashboard</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl">Processing data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50">
      {renderFileControls()}
      <div ref={dashboardRef}>
        <h1 className="text-2xl font-bold mb-6 text-center">ShipClerk Monitoring Dashboard</h1>
      
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-sm font-medium text-gray-500">Total Orders</h2>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
            <div className="flex justify-between mt-2">
              <span className="text-green-600 text-sm">Released: {stats.releasedOrders}</span>
              <span className="text-orange-500 text-sm">Changes: {stats.changesOrders}</span>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-sm font-medium text-gray-500">Total Order Value</h2>
            <p className="text-2xl font-bold">${stats.totalValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
            <p className="text-sm text-gray-600 mt-2">Avg: ${stats.avgValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-sm font-medium text-gray-500">Status Distribution</h2>
            <div className="h-16 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Released', value: stats.releasedOrders },
                      { name: 'Changes', value: stats.changesOrders }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={15}
                    outerRadius={30}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#4caf50" />
                    <Cell fill="#ff9800" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Orders by Country */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">Orders by Country</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ordersByCountry.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="country" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Release Date Distribution */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">Upcoming Release Dates</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dateDistribution}
                  margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Order Value Distribution */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">Order Value Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={orderValueRanges}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d">
                    {orderValueRanges.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Top Countries Pie Chart */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-4">Order Distribution by Country</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.topCountries}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ country, count, percent }) => `${country}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.topCountries.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value} orders`, props.payload.country]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Upcoming Releases Table */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Upcoming Releases</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Release Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {upcomingReleases.map((order, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.orderNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.company}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.releaseDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.value.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
