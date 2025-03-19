import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ArrowLeft, Calendar, FileText, Plus, Edit, Trash2, BarChart2, PieChart as PieChartIcon, Activity, RefreshCw } from 'lucide-react';

// Status options and colors - moved outside component to prevent re-creation
const STATUS_OPTIONS = [
  "Pending Verification",
  "Pending Locates",
  "Needs Construction",
  "Construction Started",
  "Needs Stingray",
  "Needs Splicing",
  "Complete"
];

// Status color mapping - corporate red/black theme
const STATUS_COLORS = {
  "Pending Verification": "#BDBDBD", // Light Gray
  "Pending Locates": "#757575", // Medium Gray
  "Needs Construction": "#B71C1C", // Dark Red
  "Construction Started": "#D32F2F", // Medium Red
  "Needs Stingray": "#E53935", // Light Red
  "Needs Splicing": "#EF5350", // Very Light Red
  "Complete": "#212121" // Very Dark Gray (almost black)
};

// Extract DB operations to a separate module
const ProjectDatabase = {
  // Initialize IndexedDB
  init: () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ProjectNetworkDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        reject('IndexedDB initialization error: ' + event.target.errorCode);
      };
    });
  },
  
  // Save all projects
  saveProjects: (projects) => {
    return new Promise((resolve, reject) => {
      ProjectDatabase.init().then(database => {
        const transaction = database.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        
        // Clear existing data
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
          // Add each project
          Object.keys(projects).forEach(projectId => {
            const project = projects[projectId];
            store.put({ id: projectId, data: project });
          });
          
          transaction.oncomplete = () => {
            resolve();
          };
          
          transaction.onerror = (event) => {
            reject('Transaction error: ' + event.target.errorCode);
          };
        };
      }).catch(error => {
        reject(error);
      });
    });
  },
  
  // Load all projects
  loadProjects: () => {
    return new Promise((resolve, reject) => {
      ProjectDatabase.init().then(database => {
        const transaction = database.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.getAll();
        
        request.onsuccess = () => {
          const projects = {};
          request.result.forEach(item => {
            projects[item.id] = item.data;
          });
          resolve(projects);
        };
        
        request.onerror = (event) => {
          reject('Read error: ' + event.target.errorCode);
        };
      }).catch(error => {
        reject(error);
      });
    });
  }
};

// Sample project data structure
const initialProjectData = {
  "FB-HDH02A": {
    name: "FB-HDH02A",
    daisyChains: [
      {
        id: 1,
        name: "Chain 1",
        tieIns: [
          { id: 70, connects: [71], status: "Construction Started" },
          { id: 71, connects: [72], status: "Needs Stingray" },
          { id: 72, connects: [73], status: "Needs Splicing" },
          { id: 73, connects: [74], status: "Needs Construction" },
          { id: 74, connects: [75], status: "Pending Locates" },
          { id: 75, connects: [76], status: "Pending Verification" },
          { id: 76, connects: [77], status: "Complete" },
          { id: 77, connects: [], status: "Pending Verification" }
        ]
      },
      // Other chains remain the same...
      {
        id: 2,
        name: "Chain 2",
        tieIns: [
          { id: 80, connects: [81], status: "Needs Construction" },
          { id: 81, connects: [82], status: "Pending Locates" },
          { id: 82, connects: [83], status: "Pending Verification" },
          { id: 83, connects: [84], status: "Complete" },
          { id: 84, connects: [85], status: "Complete" },
          { id: 85, connects: [86], status: "Complete" },
          { id: 86, connects: [87], status: "Complete" },
          { id: 87, connects: [], status: "Complete" }
        ]
      },
      {
        id: 3,
        name: "Chain 3",
        tieIns: Array(8).fill().map((_, i) => ({ 
          id: 90 + i, 
          connects: i < 7 ? [91 + i] : [], 
          status: ["Complete", "Complete", "Needs Splicing", "Construction Started", "Pending Verification", "Pending Locates", "Needs Construction", "Needs Stingray"][i] 
        }))
      },
      {
        id: 4,
        name: "Chain 4",
        tieIns: Array(8).fill().map((_, i) => ({ 
          id: 100 + i, 
          connects: i < 7 ? [101 + i] : [], 
          status: "Pending Verification"
        }))
      },
      {
        id: 5,
        name: "Chain 5",
        tieIns: Array(8).fill().map((_, i) => ({ 
          id: 110 + i, 
          connects: i < 7 ? [111 + i] : [], 
          status: i < 3 ? "Complete" : "Needs Construction"
        }))
      },
      {
        id: 6,
        name: "Chain 6",
        tieIns: Array(8).fill().map((_, i) => ({ 
          id: 120 + i, 
          connects: i < 7 ? [121 + i] : [], 
          status: ["Complete", "Complete", "Complete", "Needs Stingray", "Needs Splicing", "Construction Started", "Pending Locates", "Pending Verification"][i]
        }))
      }
    ]
  },
  "FB-HDH03B": {
    name: "FB-HDH03B",
    daisyChains: [
      {
        id: 1,
        name: "Chain 1",
        tieIns: Array(8).fill().map((_, i) => ({ 
          id: 130 + i, 
          connects: i < 7 ? [131 + i] : [], 
          status: i < 5 ? "Complete" : "Needs Construction"
        }))
      },
      {
        id: 2,
        name: "Chain 2",
        tieIns: Array(8).fill().map((_, i) => ({ 
          id: 140 + i, 
          connects: i < 7 ? [141 + i] : [], 
          status: i % 2 === 0 ? "Complete" : "Needs Splicing"
        }))
      }
    ]
  }
};

// Custom hook for LocalStorage fallback
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

// Button component for consistent styling
const Button = ({ children, onClick, color = "primary", size = "md", className = "", disabled = false, icon }) => {
  const baseClasses = "flex items-center justify-center font-medium rounded shadow transition-colors";
  
  const sizeClasses = {
    sm: "px-2 py-1 text-sm",
    md: "px-3 py-2",
    lg: "px-4 py-2 text-lg"
  };
  
  const colorClasses = {
    primary: "bg-red-700 hover:bg-red-600 text-white",
    secondary: "bg-gray-800 hover:bg-gray-700 text-white",
    dark: "bg-black hover:bg-gray-900 text-white",
    light: "bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300",
    danger: "bg-red-600 hover:bg-red-500 text-white"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${colorClasses[color]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

// Notification component
const Notification = ({ notification, onClose }) => {
  if (!notification) return null;
  
  const bgColor = notification.type === 'error' ? 'bg-red-700' : 
                  notification.type === 'success' ? 'bg-green-700' : 'bg-gray-800';
  
  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center animate-fadeIn`}>
      {notification.type === 'error' && (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
      {notification.type === 'success' && (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )}
      {notification.type === 'info' && (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      )}
      <div>
        <span className="block font-medium">{notification.title || (notification.type === 'error' ? 'Error' : notification.type === 'success' ? 'Success' : 'Information')}</span>
        <span className="block text-sm opacity-90">{notification.message}</span>
      </div>
      <button onClick={onClose} className="ml-4 p-1 text-white opacity-70 hover:opacity-100">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

// Main component
const ProjectNetworkTracker = () => {
  // State management with proper initializers to prevent unnecessary re-renders
  const [projects, setProjects] = useState({});
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedChain, setSelectedChain] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'details', 'timeline', 'network'
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showChainModal, setShowChainModal] = useState(false);
  const [showTieInModal, setShowTieInModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);
  const [chartType, setChartType] = useState('bar'); // 'bar', 'pie', 'line', 'area'
  
  // Load projects from database on component mount
  useEffect(() => {
    setIsLoading(true);
    ProjectDatabase.loadProjects()
      .then(loadedProjects => {
        if (Object.keys(loadedProjects).length === 0) {
          // If no projects in DB, use initial data
          setProjects(initialProjectData);
          setSelectedProject(Object.keys(initialProjectData)[0]);
        } else {
          setProjects(loadedProjects);
          setSelectedProject(Object.keys(loadedProjects)[0]);
        }
        setIsLoading(false);
        setLastUpdate(new Date());
      })
      .catch(error => {
        console.error('Error loading projects:', error);
        // Fallback to initial data if DB fails
        setProjects(initialProjectData);
        setSelectedProject(Object.keys(initialProjectData)[0]);
        setIsLoading(false);
        showNotification('Error loading projects from database. Using default data.', 'error');
      });
  }, []);

  // Debounced save to reduce DB writes - using a throttled approach
  useEffect(() => {
    let saveTimeout;
    
    if (!isLoading && Object.keys(projects).length > 0) {
      saveTimeout = setTimeout(() => {
        ProjectDatabase.saveProjects(projects)
          .then(() => {
            console.log('Projects saved to database successfully');
            setLastUpdate(new Date());
          })
          .catch(error => {
            console.error('Error saving projects:', error);
            showNotification('Error saving to database. Changes may not persist.', 'error');
          });
      }, 500); // 500ms debounce
    }
    
    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  }, [projects, isLoading]);

  // Reset selected chain when project changes
  useEffect(() => {
    setSelectedChain(null);
    setActiveTab('overview');
  }, [selectedProject]);

  // Show notification with timeout
  const showNotification = useCallback((message, type = 'info', title = '') => {
    setNotification({ message, type, title });
    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      setNotification(null);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Calculate project completion percentage - memoized to avoid recalculations
  const calculateCompletion = useCallback((project) => {
    let totalTieIns = 0;
    let completedTieIns = 0;

    project.daisyChains.forEach(chain => {
      chain.tieIns.forEach(tieIn => {
        totalTieIns++;
        if (tieIn.status === "Complete") {
          completedTieIns++;
        }
      });
    });

    return totalTieIns > 0 ? (completedTieIns / totalTieIns) * 100 : 0;
  }, []);

  // Calculate status distribution for charts - memoized
  const getStatusDistribution = useCallback((project) => {
    const distribution = {};
    
    STATUS_OPTIONS.forEach(status => {
      distribution[status] = 0;
    });

    project.daisyChains.forEach(chain => {
      chain.tieIns.forEach(tieIn => {
        distribution[tieIn.status]++;
      });
    });

    return Object.keys(distribution).map(status => ({
      name: status,
      value: distribution[status],
      color: STATUS_COLORS[status]
    }));
  }, []);

  // Get chain completion data for bar chart - memoized
  const getChainCompletionData = useCallback((project) => {
    return project.daisyChains.map(chain => {
      const totalTieIns = chain.tieIns.length;
      const completedTieIns = chain.tieIns.filter(tieIn => tieIn.status === "Complete").length;
      const percentage = totalTieIns > 0 ? (completedTieIns / totalTieIns) * 100 : 0;
      
      return {
        name: chain.name,
        completion: percentage
      };
    });
  }, []);
  
  // Generate trend data for timeline view - new visualization
  const getTrendData = useCallback((project) => {
    // This is simulated trend data - in a real app, you'd store timestamps
    // with status changes and generate actual historical data
    
    // For now, we'll create simulated weekly data for the last 8 weeks
    const weeks = [];
    
    for (let i = 0; i < 8; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (7 * i));
      
      // Random completion value that generally increases toward present
      // Base completion is current project completion
      const currentCompletion = calculateCompletion(project);
      
      // Completion decreases as we go back in time, with some randomness
      const completion = Math.max(0, currentCompletion - ((i * 10) + (Math.random() * 5))); 
      
      weeks.unshift({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completion: Number(completion.toFixed(1))
      });
    }
    
    return weeks;
  }, [calculateCompletion]);
  
  // New function to calculate status change timeline
  const getStatusTimeline = useCallback((project) => {
    // This would ideally use actual historical data
    // For now, we'll create mock data representing status distribution over time
    
    const statusData = [];
    const currentDistribution = getStatusDistribution(project);
    
    // Create 8 weekly data points
    for (let i = 0; i < 8; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (7 * i));
      
      const weekData = {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
      
      // For each status, calculate a value
      // As we go back in time:
      // - "Complete" decreases
      // - Early stages like "Pending" increase
      // - Add some randomness
      STATUS_OPTIONS.forEach(status => {
        const currentValue = currentDistribution.find(s => s.name === status)?.value || 0;
        
        if (status === "Complete") {
          // Complete nodes decrease as we go back in time
          weekData[status] = Math.max(0, currentValue - (i * 2 + Math.random() * 2));
        } else if (status === "Pending Verification" || status === "Pending Locates") {
          // Early stages had more nodes in the past
          weekData[status] = Math.max(0, currentValue + (i * 1.5 + Math.random() * 2));
        } else {
          // Other statuses vary randomly around their current value
          weekData[status] = Math.max(0, currentValue + (Math.random() * 4 - 2));
        }
        
        // Round to whole numbers
        weekData[status] = Math.round(weekData[status]);
      });
      
      statusData.unshift(weekData);
    }
    
    return statusData;
  }, [getStatusDistribution]);

  // Get network diagram data - new visualization
  const getNetworkData = useCallback((project, chainId) => {
    if (!project || !chainId) return [];
    
    const chain = project.daisyChains.find(c => c.id === chainId);
    if (!chain) return [];
    
    // Create nodes and links for network visualization
    const nodes = chain.tieIns.map(tieIn => ({
      id: `${tieIn.id}`,
      name: `Tie-In ${tieIn.id}`,
      status: tieIn.status,
      color: STATUS_COLORS[tieIn.status],
      value: 1 // Size of node
    }));
    
    const links = [];
    chain.tieIns.forEach(tieIn => {
      tieIn.connects.forEach(targetId => {
        links.push({
          source: `${tieIn.id}`,
          target: `${targetId}`,
          value: 1 // Strength of link
        });
      });
    });
    
    return { nodes, links };
  }, []);

  // Add a new project
  const addProject = useCallback((projectData) => {
    setProjects(prev => ({
      ...prev,
      [projectData.id]: {
        name: projectData.name,
        daisyChains: []
      }
    }));
    setSelectedProject(projectData.id);
    showNotification(`Project "${projectData.id}" created successfully`, 'success');
  }, [showNotification]);

  // Update an existing project
  const updateProject = useCallback((oldId, projectData) => {
    setProjects(prev => {
      const projectContent = prev[oldId];
      const newProjects = { ...prev };
      
      delete newProjects[oldId];
      newProjects[projectData.id] = {
        ...projectContent,
        name: projectData.name
      };
      
      return newProjects;
    });
    
    setSelectedProject(projectData.id);
    showNotification(`Project "${projectData.id}" updated successfully`, 'success');
  }, [showNotification]);

  // Delete a project with confirmation
  const deleteProject = useCallback((projectId) => {
    if (confirm(`Are you sure you want to delete project ${projectId}?`)) {
      setProjects(prev => {
        const newProjects = { ...prev };
        delete newProjects[projectId];
        
        const remainingProjects = Object.keys(newProjects);
        if (remainingProjects.length > 0) {
          setSelectedProject(remainingProjects[0]);
        } else {
          setSelectedProject('');
        }
        
        return newProjects;
      });
      
      showNotification(`Project "${projectId}" deleted`, 'info');
    }
  }, [showNotification]);

  // Update tie-in status
  const updateTieInStatus = useCallback((chainId, tieInId, newStatus) => {
    setProjects(prevProjects => {
      const updatedProjects = { ...prevProjects };
      const project = updatedProjects[selectedProject];
      
      const chainIndex = project.daisyChains.findIndex(chain => chain.id === chainId);
      if (chainIndex !== -1) {
        const tieInIndex = project.daisyChains[chainIndex].tieIns.findIndex(tieIn => tieIn.id === tieInId);
        if (tieInIndex !== -1) {
          project.daisyChains[chainIndex].tieIns[tieInIndex].status = newStatus;
        }
      }
      
      return updatedProjects;
    });
  }, [selectedProject]);

  // Delete a chain with confirmation
  const deleteChain = useCallback((chainId) => {
    if (confirm(`Are you sure you want to delete this chain?`)) {
      setProjects(prev => {
        const updatedProject = { ...prev[selectedProject] };
        updatedProject.daisyChains = updatedProject.daisyChains.filter(c => c.id !== chainId);
        return { ...prev, [selectedProject]: updatedProject };
      });
      
      setSelectedChain(null);
      showNotification(`Chain deleted successfully`, 'info');
    }
  }, [selectedProject, showNotification]);

  // Delete a tie-in with confirmation
  const deleteTieIn = useCallback((chainId, tieInId) => {
    if (confirm(`Are you sure you want to delete tie-in ${tieInId}?`)) {
      setProjects(prev => {
        const updatedProject = { ...prev[selectedProject] };
        const chainIndex = updatedProject.daisyChains.findIndex(c => c.id === chainId);
        
        if (chainIndex !== -1) {
          updatedProject.daisyChains[chainIndex].tieIns = 
            updatedProject.daisyChains[chainIndex].tieIns.filter(t => t.id !== tieInId);
        }
        
        return { ...prev, [selectedProject]: updatedProject };
      });
      
      showNotification(`Tie-in ${tieInId} deleted`, 'info');
    }
  }, [selectedProject, showNotification]);

  // Get current project data - memoized to prevent unnecessary calculations
  const currentProject = useMemo(() => 
    selectedProject ? projects[selectedProject] : null
  , [selectedProject, projects]);
  
  // Calculate project completion and chart data - memoized
  const projectCompletion = useMemo(() => 
    currentProject ? calculateCompletion(currentProject) : 0
  , [currentProject, calculateCompletion]);
  
  const statusDistribution = useMemo(() => 
    currentProject ? getStatusDistribution(currentProject) : []
  , [currentProject, getStatusDistribution]);
  
  const chainCompletionData = useMemo(() => 
    currentProject ? getChainCompletionData(currentProject) : []
  , [currentProject, getChainCompletionData]);
  
  const trendData = useMemo(() => 
    currentProject ? getTrendData(currentProject) : []
  , [currentProject, getTrendData]);
  
  const statusTimelineData = useMemo(() => 
    currentProject ? getStatusTimeline(currentProject) : []
  , [currentProject, getStatusTimeline]);
  
  const selectedChainData = useMemo(() => 
    currentProject && selectedChain ? 
      currentProject.daisyChains.find(chain => chain.id === selectedChain) : null
  , [currentProject, selectedChain]);
  
  const networkData = useMemo(() => 
    currentProject && selectedChain ? 
      getNetworkData(currentProject, selectedChain) : { nodes: [], links: [] }
  , [currentProject, selectedChain, getNetworkData]);

  // Modal component for projects
  const ProjectModal = () => {
    const [projectData, setProjectData] = useState(
      modalMode === 'edit' ? 
        { id: editingItem, name: projects[editingItem].name } : 
        { id: '', name: '' }
    );

    const handleSubmit = (e) => {
      e.preventDefault();
      
      if (modalMode === 'add') {
        // Add new project
        addProject(projectData);
      } else {
        // Edit existing project
        updateProject(editingItem, projectData);
      }
      
      setShowProjectModal(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} p-6 rounded-lg shadow-lg w-full max-w-md animate-slideIn`}>
          <h2 className="text-xl font-bold mb-4">
            {modalMode === 'add' ? 'Add New Project' : 'Edit Project'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Project ID</label>
              <input
                type="text"
                value={projectData.id}
                onChange={(e) => setProjectData({...projectData, id: e.target.value})}
                className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                placeholder="e.g. FB-HDH02A"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Project Name</label>
              <input
                type="text"
                value={projectData.name}
                onChange={(e) => setProjectData({...projectData, name: e.target.value})}
                className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                placeholder="Project Name"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                onClick={() => setShowProjectModal(false)} 
                color="light"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                color="primary"
              >
                {modalMode === 'add' ? 'Create Project' : 'Update Project'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Modal component for chains
  const ChainModal = () => {
    const [chainData, setChainData] = useState(
      modalMode === 'edit' && editingItem ? 
        { 
          id: editingItem.id, 
          name: editingItem.name 
        } : 
        { 
          id: projects[selectedProject].daisyChains.length > 0 ? 
              Math.max(...projects[selectedProject].daisyChains.map(c => c.id)) + 1 : 
              1, 
          name: `Chain ${projects[selectedProject].daisyChains.length + 1}` 
        }
    );

    const handleSubmit = (e) => {
      e.preventDefault();
      
      if (modalMode === 'add') {
        // Add new chain
        setProjects(prev => {
          const updatedProject = { ...prev[selectedProject] };
          updatedProject.daisyChains = [
            ...updatedProject.daisyChains,
            {
              id: parseInt(chainData.id),
              name: chainData.name,
              tieIns: []
            }
          ];
          return { ...prev, [selectedProject]: updatedProject };
        });
      } else {
        // Edit existing chain
        setProjects(prev => {
          const updatedProject = { ...prev[selectedProject] };
          const chainIndex = updatedProject.daisyChains.findIndex(c => c.id === editingItem.id);
          
          if (chainIndex !== -1) {
            updatedProject.daisyChains[chainIndex] = {
              ...updatedProject.daisyChains[chainIndex],
              id: parseInt(chainData.id),
              name: chainData.name
            };
          }
          
          return { ...prev, [selectedProject]: updatedProject };
        });
      }
      
      setShowChainModal(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} p-6 rounded-lg shadow-lg w-full max-w-md animate-slideIn`}>
          <h2 className="text-xl font-bold mb-4">
            {modalMode === 'add' ? 'Add New Daisy Chain' : 'Edit Daisy Chain'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Chain ID</label>
              <input
                type="number"
                value={chainData.id}
                onChange={(e) => setChainData({...chainData, id: e.target.value})}
                className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Chain Name</label>
              <input
                type="text"
                value={chainData.name}
                onChange={(e) => setChainData({...chainData, name: e.target.value})}
                className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                placeholder="Chain Name"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                onClick={() => setShowChainModal(false)} 
                color="light"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                color="primary"
              >
                {modalMode === 'add' ? 'Create Chain' : 'Update Chain'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Modal component for tie-ins
  const TieInModal = () => {
    const [tieInData, setTieInData] = useState(
      modalMode === 'edit' && editingItem ? 
        { 
          id: editingItem.id, 
          connects: editingItem.connects.join(','), 
          status: editingItem.status 
        } : 
        { 
          id: '', 
          connects: '', 
          status: STATUS_OPTIONS[0] 
        }
    );

    const handleSubmit = (e) => {
      e.preventDefault();
      
      const connectsArray = tieInData.connects 
        ? tieInData.connects.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        : [];
      
      if (modalMode === 'add') {
        // Add new tie-in
        setProjects(prev => {
          const updatedProject = { ...prev[selectedProject] };
          const chainIndex = updatedProject.daisyChains.findIndex(c => c.id === selectedChain);
          
          if (chainIndex !== -1) {
            updatedProject.daisyChains[chainIndex].tieIns.push({
              id: parseInt(tieInData.id),
              connects: connectsArray,
              status: tieInData.status
            });
          }
          
          return { ...prev, [selectedProject]: updatedProject };
        });
      } else {
        // Edit existing tie-in
        setProjects(prev => {
          const updatedProject = { ...prev[selectedProject] };
          const chain = updatedProject.daisyChains.find(c => c.id === selectedChain);
          
          if (chain) {
            const tieInIndex = chain.tieIns.findIndex(t => t.id === editingItem.id);
            if (tieInIndex !== -1) {
              chain.tieIns[tieInIndex] = {
                id: parseInt(tieInData.id),
                connects: connectsArray,
                status: tieInData.status
              };
            }
          }
          
          return { ...prev, [selectedProject]: updatedProject };
        });
      }
      
      setShowTieInModal(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} p-6 rounded-lg shadow-lg w-full max-w-md animate-slideIn`}>
          <h2 className="text-xl font-bold mb-4">
            {modalMode === 'add' ? 'Add New Tie-In' : 'Edit Tie-In'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Tie-In ID</label>
              <input
                type="number"
                value={tieInData.id}
                onChange={(e) => setTieInData({...tieInData, id: e.target.value})}
                className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Connects To (comma-separated IDs)</label>
              <input
                type="text"
                value={tieInData.connects}
                onChange={(e) => setTieInData({...tieInData, connects: e.target.value})}
                className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                placeholder="e.g. 71,72,73"
              />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Leave empty for end points</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={tieInData.status}
                onChange={(e) => setTieInData({...tieInData, status: e.target.value})}
                className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                onClick={() => setShowTieInModal(false)} 
                color="light"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                color="primary"
              >
                {modalMode === 'add' ? 'Create Tie-In' : 'Update Tie-In'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Render tie-in node with improved styling
  const renderTieIn = (tieIn, chainId) => {
    return (
      <div 
        key={tieIn.id} 
        className={`p-3 mb-2 rounded-lg shadow-md transition-all hover:shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`} 
        style={{ 
          borderLeft: `4px solid ${STATUS_COLORS[tieIn.status]}`,
          backgroundColor: `${STATUS_COLORS[tieIn.status]}${darkMode ? '20' : '10'}`
        }}
      >
        <div className="flex justify-between items-center">
          <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Tie-In {tieIn.id}
          </div>
          <div className="flex items-center space-x-2">
            <select 
              value={tieIn.status}
              onChange={(e) => updateTieInStatus(chainId, tieIn.id, e.target.value)}
              className={`text-sm border rounded p-1 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
              style={{ 
                borderColor: STATUS_COLORS[tieIn.status],
                backgroundColor: `${STATUS_COLORS[tieIn.status]}15`
              }}
            >
              {STATUS_OPTIONS.map(option => (
                <option 
                  key={option} 
                  value={option} 
                  style={{fontWeight: 'medium'}}
                >
                  {option}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setModalMode('edit');
                setEditingItem(tieIn);
                setShowTieInModal(true);
              }}
              className="bg-gray-800 text-white p-1 rounded text-xs"
              title="Edit Tie-In"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => deleteTieIn(chainId, tieIn.id)}
              className="bg-black text-white p-1 rounded text-xs"
              title="Delete Tie-In"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {tieIn.connects.length > 0 && (
          <div className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Connects to: {tieIn.connects.map(id => `Tie-In ${id}`).join(', ')}
          </div>
        )}
      </div>
    );
  };

  // Render daisy chain with improved styling
  const renderDaisyChain = (chain) => {
    return (
      <div key={chain.id} className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} p-4 rounded-lg shadow-md mb-4 border-t-4 border-red-700`}>
        <h3 className="text-lg font-semibold mb-3">{chain.name}</h3>
        <div className="grid grid-cols-1 gap-2">
          {chain.tieIns.map(tieIn => renderTieIn(tieIn, chain.id))}
          
          {/* Add Tie-In button */}
          <button
            onClick={() => {
              setModalMode('add');
              setEditingItem(null);
              setShowTieInModal(true);
            }}
            className={`p-3 mb-2 rounded-lg border-2 border-dashed ${
              darkMode ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300' 
              : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600'
            } flex items-center justify-center transition-colors`}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Tie-In
          </button>
        </div>
      </div>
    );
  };

  // New component for project timeline visualization
  const ProjectTimeline = () => {
    if (!currentProject) return null;
    
    return (
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} p-4 rounded-lg shadow-md mb-6`}>
        <h3 className="text-lg font-semibold mb-4">Project Progress Timeline</h3>
        
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#e0e0e0'} />
              <XAxis 
                dataKey="date" 
                axisLine={{ stroke: darkMode ? '#555' : '#333' }} 
                tick={{ fill: darkMode ? '#bbb' : '#333' }} 
                tickLine={{ stroke: darkMode ? '#555' : '#333' }}
              />
              <YAxis 
                label={{ 
                  value: 'Completion %', 
                  angle: -90, 
                  position: 'insideLeft', 
                  fill: darkMode ? '#bbb' : '#333',
                  style: { textAnchor: 'middle' }
                }} 
                domain={[0, 100]}
                axisLine={{ stroke: darkMode ? '#555' : '#333' }} 
                tick={{ fill: darkMode ? '#bbb' : '#333' }} 
                tickLine={{ stroke: darkMode ? '#555' : '#333' }}
              />
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Completion']}
                contentStyle={{
                  backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                  border: darkMode ? '1px solid #555' : '1px solid #ccc',
                  borderRadius: '4px',
                  color: darkMode ? 'white' : 'black'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="completion" 
                stroke="#B91C1C" 
                strokeWidth={3}
                dot={{ r: 6, fill: "#B91C1C", strokeWidth: 1, stroke: darkMode ? '#333' : '#fff' }}
                activeDot={{ r: 8, fill: "#B91C1C", stroke: darkMode ? '#333' : '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Status Distribution Over Time</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={statusTimelineData}
                margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                stackOffset="expand"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#e0e0e0'} />
                <XAxis 
                  dataKey="date" 
                  axisLine={{ stroke: darkMode ? '#555' : '#333' }} 
                  tick={{ fill: darkMode ? '#bbb' : '#333' }} 
                  tickLine={{ stroke: darkMode ? '#555' : '#333' }}
                />
                <YAxis 
                  tickFormatter={(tick) => `${Math.round(tick * 100)}%`}
                  axisLine={{ stroke: darkMode ? '#555' : '#333' }} 
                  tick={{ fill: darkMode ? '#bbb' : '#333' }} 
                  tickLine={{ stroke: darkMode ? '#555' : '#333' }}
                />
                <Tooltip 
                  formatter={(value, name) => [`${value} nodes`, name]}
                  contentStyle={{
                    backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    border: darkMode ? '1px solid #555' : '1px solid #ccc',
                    borderRadius: '4px',
                    color: darkMode ? 'white' : 'black'
                  }}
                />
                <Legend />
                {STATUS_OPTIONS.map((status) => (
                  <Area 
                    key={status}
                    type="monotone" 
                    dataKey={status} 
                    stackId="1"
                    fill={STATUS_COLORS[status]} 
                    stroke={STATUS_COLORS[status]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // Project overview with visualizations - uses dynamic chart type
  const ProjectOverview = () => {
    if (!currentProject) return null;
    
    // Chart type selector
    const ChartTypeSelector = () => (
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setChartType('bar')}
          className={`flex items-center p-2 rounded ${chartType === 'bar' 
            ? 'bg-red-700 text-white' 
            : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
        >
          <BarChart2 className="h-4 w-4 mr-1" />
          Bar
        </button>
        <button
          onClick={() => setChartType('pie')}
          className={`flex items-center p-2 rounded ${chartType === 'pie' 
            ? 'bg-red-700 text-white' 
            : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
        >
          <PieChartIcon className="h-4 w-4 mr-1" />
          Pie
        </button>
        <button
          onClick={() => setChartType('line')}
          className={`flex items-center p-2 rounded ${chartType === 'line' 
            ? 'bg-red-700 text-white' 
            : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
        >
          <Activity className="h-4 w-4 mr-1" />
          Line
        </button>
        <button
          onClick={() => setChartType('area')}
          className={`flex items-center p-2 rounded ${chartType === 'area' 
            ? 'bg-red-700 text-white' 
            : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Area
        </button>
      </div>
    );
    
    return (
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-md p-6 mb-6 border-t-4 border-red-700`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{currentProject.name} Overview</h2>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-700">{projectCompletion.toFixed(1)}%</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Complete</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>Status Distribution</h3>
              <ChartTypeSelector />
            </div>

            <div className="h-72">
              {chartType === 'pie' && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke={darkMode ? '#333' : '#fff'} strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} tie-ins`, 'Count']} 
                      contentStyle={{
                        backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        border: darkMode ? '1px solid #555' : '1px solid #ccc',
                        borderRadius: '4px',
                        color: darkMode ? 'white' : 'black'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      iconType="circle" 
                      layout="horizontal" 
                      align="center"
                      formatter={(value) => <span style={{ color: darkMode ? '#ddd' : '#333' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {chartType === 'bar' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusDistribution}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#e0e0e0'} />
                    <XAxis 
                      type="number" 
                      axisLine={{ stroke: darkMode ? '#555' : '#333' }} 
                      tick={{ fill: darkMode ? '#bbb' : '#333' }} 
                      tickLine={{ stroke: darkMode ? '#555' : '#333' }}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={{ stroke: darkMode ? '#555' : '#333' }} 
                      tick={{ fill: darkMode ? '#bbb' : '#333' }} 
                      tickLine={{ stroke: darkMode ? '#555' : '#333' }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value} tie-ins`, 'Count']}
                      contentStyle={{
                        backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        border: darkMode ? '1px solid #555' : '1px solid #ccc',
                        borderRadius: '4px',
                        color: darkMode ? 'white' : 'black'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="value" 
                      name="Count" 
                      radius={[0, 4, 4, 0]}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {chartType === 'line' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#e0e0e0'} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={{ stroke: darkMode ? '#555' : '#333' }} 
                      tick={{ fill: darkMode ? '#bbb' : '#333' }} 
                      tickLine={{ stroke: darkMode ? '#555' : '#333' }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      axisLine={{ stroke: darkMode ? '#555' : '#333' }} 
                      tick={{ fill: darkMode ? '#bbb' : '#333' }} 
                      tickLine={{ stroke: darkMode ? '#555' : '#333' }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Completion']}
                      contentStyle={{
                        backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        border: darkMode ? '1px solid #555' : '1px solid #ccc',
                        borderRadius: '4px',
                        color: darkMode ? 'white' : 'black'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="completion" 
                      name="Completion %"
                      stroke="#B91C1C" 
                      strokeWidth={3}
                      dot={{ r: 6, fill: "#B91C1C", strokeWidth: 1, stroke: darkMode ? '#333' : '#fff' }}
                      activeDot={{ r: 8, fill: "#B91C1C", stroke: darkMode ? '#333' : '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {chartType === 'area' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={statusTimelineData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                    stackOffset="expand"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#e0e0e0'} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={{ stroke: darkMode ? '#555' : '#333' }} 
                      tick={{ fill: darkMode ? '#bbb' : '#333' }} 
                      tickLine={{ stroke: darkMode ? '#555' : '#333' }}
                    />
<YAxis 
                      tickFormatter={(tick) => `${Math.round(tick * 100)}%`}
                      axisLine={{ stroke: darkMode ? '#555' : '#333' }} 
                      tick={{ fill: darkMode ? '#bbb' : '#333' }} 
                      tickLine={{ stroke: darkMode ? '#555' : '#333' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [`${value} nodes`, name]}
                      contentStyle={{
                        backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        border: darkMode ? '1px solid #555' : '1px solid #ccc',
                        borderRadius: '4px',
                        color: darkMode ? 'white' : 'black'
                      }}
                    />
                    <Legend />
                    {STATUS_OPTIONS.map((status) => (
                      <Area 
                        key={status}
                        type="monotone" 
                        dataKey={status} 
                        stackId="1"
                        name={status}
                        fill={STATUS_COLORS[status]} 
                        stroke={STATUS_COLORS[status]}
                        fillOpacity={0.6}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          
          {/* Chain Completion Chart */}
          <div>
            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>Chain Completion</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chainCompletionData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B91C1C" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#B91C1C" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#e0e0e0'} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={{ stroke: darkMode ? '#555' : '#333' }} 
                    tick={{ fill: darkMode ? '#bbb' : '#333' }} 
                    tickLine={{ stroke: darkMode ? '#555' : '#333' }}
                  />
                  <YAxis 
                    label={{ 
                      value: 'Completion %', 
                      angle: -90, 
                      position: 'insideLeft', 
                      fill: darkMode ? '#bbb' : '#333',
                      style: { textAnchor: 'middle' }
                    }} 
                    domain={[0, 100]}
                    axisLine={{ stroke: darkMode ? '#555' : '#333' }} 
                    tick={{ fill: darkMode ? '#bbb' : '#333' }} 
                    tickLine={{ stroke: darkMode ? '#555' : '#333' }}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Completion']} 
                    contentStyle={{
                      backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                      border: darkMode ? '1px solid #555' : '1px solid #ccc',
                      borderRadius: '4px',
                      color: darkMode ? 'white' : 'black'
                    }}
                  />
                  <Bar 
                    dataKey="completion" 
                    fill="url(#colorCompletion)" 
                    barSize={30} 
                    radius={[4, 4, 0, 0]}
                  >
                    {chainCompletionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} 
                        fill={entry.completion > 75 ? '#212121' : 
                              entry.completion > 50 ? '#D32F2F' : 
                              entry.completion > 25 ? '#E53935' : '#EF5350'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Project summary statistics - new addition */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Chains */}
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-4 rounded-lg`}>
            <h4 className={`text-sm uppercase font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Chains</h4>
            <div className="mt-2 flex items-end">
              <span className="text-2xl font-bold">{currentProject.daisyChains.length}</span>
            </div>
          </div>
          
          {/* Total Tie-Ins */}
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-4 rounded-lg`}>
            <h4 className={`text-sm uppercase font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Tie-Ins</h4>
            <div className="mt-2 flex items-end">
              <span className="text-2xl font-bold">
                {currentProject.daisyChains.reduce((acc, chain) => acc + chain.tieIns.length, 0)}
              </span>
            </div>
          </div>
          
          {/* Complete Tie-Ins */}
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-4 rounded-lg`}>
            <h4 className={`text-sm uppercase font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completed</h4>
            <div className="mt-2 flex items-end">
              <span className="text-2xl font-bold">
                {currentProject.daisyChains.reduce((acc, chain) => {
                  return acc + chain.tieIns.filter(t => t.status === "Complete").length;
                }, 0)}
              </span>
            </div>
          </div>
          
          {/* Pending Actions */}
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-4 rounded-lg`}>
            <h4 className={`text-sm uppercase font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Needs Attention</h4>
            <div className="mt-2 flex items-end">
              <span className="text-2xl font-bold text-red-600">
                {currentProject.daisyChains.reduce((acc, chain) => {
                  return acc + chain.tieIns.filter(t => 
                    t.status === "Needs Construction" || 
                    t.status === "Needs Stingray" || 
                    t.status === "Needs Splicing"
                  ).length;
                }, 0)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Last update timestamp */}
        <div className="mt-4 text-right">
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <Calendar className="h-4 w-4 inline-block mr-1" />
            Last updated: {lastUpdate.toLocaleTimeString()} on {lastUpdate.toLocaleDateString()}
          </span>
        </div>
      </div>
    );
  };

  // Generate printable report with enhanced layout
  const renderPrintableReport = () => {
    const project = projects[selectedProject];
    const completion = calculateCompletion(project);
    const statusDistribution = getStatusDistribution(project);
    
    return (
      <div className="p-8 bg-white">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Project Report: {project.name}</h1>
          <p className="text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Project Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-2"><strong>Project Completion:</strong> {completion.toFixed(1)}%</p>
              <p className="mb-2"><strong>Total Daisy Chains:</strong> {project.daisyChains.length}</p>
              <p className="mb-2"><strong>Total Tie-Ins:</strong> {project.daisyChains.reduce((acc, chain) => acc + chain.tieIns.length, 0)}</p>
              <p className="mb-2">
                <strong>Needs Attention:</strong> {project.daisyChains.reduce((acc, chain) => {
                  return acc + chain.tieIns.filter(t => 
                    t.status === "Needs Construction" || 
                    t.status === "Needs Stingray" || 
                    t.status === "Needs Splicing"
                  ).length;
                }, 0)} tie-ins
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Status Distribution:</h3>
              <ul className="list-disc pl-5">
                {statusDistribution.map(item => (
                  <li key={item.name} className="mb-1">
                    <span className="inline-block w-4 h-4 mr-2" style={{ backgroundColor: item.color }}></span>
                    {item.name}: {item.value} tie-ins
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Daisy Chain Details</h2>
          {project.daisyChains.map(chain => {
            const completedTieIns = chain.tieIns.filter(tieIn => tieIn.status === "Complete").length;
            const percentage = chain.tieIns.length > 0 ? (completedTieIns / chain.tieIns.length) * 100 : 0;
            
            return (
              <div key={chain.id} className="mb-6 break-inside-avoid">
                <h3 className="text-lg font-medium mb-2">{chain.name}</h3>
                <p className="mb-2">Completion: {percentage.toFixed(1)}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div 
                    className="bg-red-700 h-2.5 rounded-full" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Tie-In ID</th>
                      <th className="border p-2 text-left">Connects To</th>
                      <th className="border p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chain.tieIns.map(tieIn => (
                      <tr key={tieIn.id}>
                        <td className="border p-2">{tieIn.id}</td>
                        <td className="border p-2">{tieIn.connects.length > 0 ? tieIn.connects.join(', ') : 'None'}</td>
                        <td className="border p-2">
                          <span className="inline-block w-3 h-3 mr-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[tieIn.status] }}></span>
                          {tieIn.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
        
        <div className="mt-12 border-t pt-4 text-center text-gray-500 text-sm">
          <p>This report contains confidential information and is intended for internal use only.</p>
          <p className="mt-1">Generated by Project Network Tracker on {new Date().toLocaleString()}</p>
        </div>
      </div>
    );
  };

  // Empty state component for when there are no projects
  const EmptyState = () => (
    <div className={`text-center py-10 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <h3 className="text-xl font-semibold mb-2">No Projects Available</h3>
      <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>Get started by creating your first project</p>
      <Button 
        onClick={() => {
          setModalMode('add');
          setEditingItem(null);
          setShowProjectModal(true);
        }}
        color="primary"
        icon={<Plus className="h-5 w-5" />}
      >
        Create New Project
      </Button>
    </div>
  );

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-700 mx-auto mb-4"></div>
        <p className={`text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>Loading project data...</p>
      </div>
    </div>
  );

  // Main render function
  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      {/* Notification component */}
      {notification && (
        <Notification 
          notification={notification} 
          onClose={() => setNotification(null)} 
        />
      )}
      
      {/* Loading state */}
      {isLoading ? <LoadingSpinner /> : (
        <>
          {/* Modals */}
          {showProjectModal && <ProjectModal />}
          {showChainModal && <ChainModal />}
          {showTieInModal && <TieInModal />}
          
          {/* Print preview */}
          {showPrintPreview ? (
            <div className="fixed inset-0 bg-white overflow-auto z-50">
              <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">Print Preview</h2>
                <div>
                  <Button 
                    onClick={() => window.print()} 
                    color="primary"
                    icon={<FileText className="h-5 w-5" />}
                    className="mr-2"
                  >
                    Print
                  </Button>
                  <Button 
                    onClick={() => setShowPrintPreview(false)} 
                    color="light"
                  >
                    Close
                  </Button>
                </div>
              </div>
              <div className="print-content">
                {renderPrintableReport()}
              </div>
            </div>
          ) : (
            <>
              {/* App header */}
              <header className={`${darkMode ? 'bg-gray-800' : 'bg-black'} text-white p-4 shadow-md sticky top-0 z-10`}>
                <div className="container mx-auto flex justify-between items-center">
                  <h1 className="text-2xl font-bold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    Project Network Tracker
                  </h1>
                  
                  <div className="flex items-center">
                    {/* Project selector */}
                    <select 
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-red-800 border-red-700'} text-white border rounded p-2 mr-3`}
                      disabled={Object.keys(projects).length === 0}
                    >
                      {Object.keys(projects).length > 0 ? (
                        Object.keys(projects).map(projectId => (
                          <option key={projectId} value={projectId}>{projects[projectId].name}</option>
                        ))
                      ) : (
                        <option value="">No Projects</option>
                      )}
                    </select>
                    
                    {/* Action buttons */}
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => {
                          setModalMode('add');
                          setEditingItem(null);
                          setShowProjectModal(true);
                        }}
                        color="primary"
                        icon={<Plus className="h-5 w-5" />}
                      >
                        Add Project
                      </Button>
                      
                      <Button 
                        onClick={() => {
                          setModalMode('edit');
                          setEditingItem(selectedProject);
                          setShowProjectModal(true);
                        }}
                        color="secondary"
                        icon={<Edit className="h-5 w-5" />}
                        disabled={!selectedProject}
                      >
                        Edit
                      </Button>
                      
                      <Button 
                        onClick={() => deleteProject(selectedProject)}
                        color="dark"
                        icon={<Trash2 className="h-5 w-5" />}
                        disabled={!selectedProject}
                      >
                        Delete
                      </Button>
                      
                      <Button 
                        onClick={() => setShowPrintPreview(true)}
                        color="secondary"
                        icon={<FileText className="h-5 w-5" />}
                        disabled={!selectedProject}
                      >
                        Report
                      </Button>
                      
                      {/* Dark mode toggle */}
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-700 text-gray-300'}`}
                        aria-label="Toggle dark mode"
                      >
                        {darkMode ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </header>
              
              {/* Main content */}
              <main className="container mx-auto p-4">
                {selectedProject ? (
                  <>
                    {/* Tabs navigation */}
                    <div className="mb-6 border-b border-gray-300 dark:border-gray-700">
                      <ul className="flex flex-wrap -mb-px">
                        <li className="mr-2">
                          <button
                            className={`inline-block py-3 px-4 font-medium text-center rounded-t-lg border-b-2 ${
                              activeTab === 'overview' 
                                ? `border-red-600 text-red-600 ${darkMode ? 'dark:text-red-500 dark:border-red-500' : ''}` 
                                : `border-transparent ${darkMode ? 'hover:text-gray-300 hover:border-gray-300' : 'hover:text-gray-600 hover:border-gray-300'}`
                            }`}
                            onClick={() => setActiveTab('overview')}
                          >
                            Overview
                          </button>
                        </li>
                        <li className="mr-2">
                          <button
                            className={`inline-block py-3 px-4 font-medium text-center rounded-t-lg border-b-2 ${
                              activeTab === 'timeline' 
                                ? `border-red-600 text-red-600 ${darkMode ? 'dark:text-red-500 dark:border-red-500' : ''}` 
                                : `border-transparent ${darkMode ? 'hover:text-gray-300 hover:border-gray-300' : 'hover:text-gray-600 hover:border-gray-300'}`
                            }`}
                            onClick={() => setActiveTab('timeline')}
                          >
                            Timeline
                          </button>
                        </li>
                        <li className="mr-2">
                          <button
                            className={`inline-block py-3 px-4 font-medium text-center rounded-t-lg border-b-2 ${
                              activeTab === 'chains' 
                                ? `border-red-600 text-red-600 ${darkMode ? 'dark:text-red-500 dark:border-red-500' : ''}` 
                                : `border-transparent ${darkMode ? 'hover:text-gray-300 hover:border-gray-300' : 'hover:text-gray-600 hover:border-gray-300'}`
                            }`}
                            onClick={() => {
                              setActiveTab('chains');
                              setSelectedChain(null);
                            }}
                          >
                            Chains
                          </button>
                        </li>
                      </ul>
                    </div>
                    
                    {/* Tab content */}
                    {activeTab === 'overview' && <ProjectOverview />}
                    {activeTab === 'timeline' && <ProjectTimeline />}
                    
                    {activeTab === 'chains' && (
                      <>
                        {/* Chains view */}
                        <div className="flex justify-between items-center mb-4">
                          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Daisy Chains</h2>
                          {!selectedChain && (
                            <Button
                              onClick={() => {
                                setModalMode('add');
                                setEditingItem(null);
                                setShowChainModal(true);
                              }}
                              color="primary"
                              icon={<Plus className="h-5 w-5" />}
                              disabled={!selectedProject}
                            >
                              Add Daisy Chain
                            </Button>
                          )}
                        </div>
                        
                        {selectedChain ? (
                          <>
                            {/* Selected chain view */}
                            <div className="mb-4 flex justify-between items-center">
                              <Button 
                                onClick={() => setSelectedChain(null)}
                                color="light"
                                icon={<ArrowLeft className="h-5 w-5" />}
                              >
                                Back to All Chains
                              </Button>
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => {
                                    setModalMode('add');
                                    setEditingItem(null);
                                    setShowTieInModal(true);
                                  }}
                                  color="primary"
                                  icon={<Plus className="h-5 w-5" />}
                                >
                                  Add Tie-In
                                </Button>
                                <Button
                                  onClick={() => {
                                    setModalMode('edit');
                                    const chain = currentProject.daisyChains.find(c => c.id === selectedChain);
                                    setEditingItem(chain);
                                    setShowChainModal(true);
                                  }}
                                  color="secondary"
                                  icon={<Edit className="h-5 w-5" />}
                                >
                                  Edit Chain
                                </Button>
                                <Button
                                  onClick={() => deleteChain(selectedChain)}
                                  color="dark"
                                  icon={<Trash2 className="h-5 w-5" />}
                                >
                                  Delete Chain
                                </Button>
                              </div>
                            </div>
                            {renderDaisyChain(selectedChainData)}
                          </>
                        ) : (
                          <>
                            {/* Chains grid */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-4">
                              {currentProject && currentProject.daisyChains.map(chain => {
                                const completedTieIns = chain.tieIns.filter(tieIn => tieIn.status === "Complete").length;
                                const percentage = chain.tieIns.length > 0 ? (completedTieIns / chain.tieIns.length) * 100 : 0;
                                
                                return (
                                  <div 
                                    key={chain.id} 
                                    className={`${
                                      darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                                    } rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-all border-l-4 border-red-700`}
                                    onClick={() => setSelectedChain(chain.id)}
                                  >
                                    <h3 className="text-lg font-semibold mb-2">{chain.name}</h3>
                                    <div className="flex justify-between items-center mb-2">
                                      <span>{completedTieIns} of {chain.tieIns.length} Complete</span>
                                      <span className="font-bold">{percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                                      <div 
                                        className="bg-red-700 h-2.5 rounded-full" 
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                    </div>
                                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                      {chain.tieIns.length} tie-ins • Click to view details
                                    </div>
                                    
                                    {/* Status indicators */}
                                    <div className="mt-3 flex flex-wrap gap-1">
                                      {STATUS_OPTIONS.some(status => chain.tieIns.some(t => t.status === status)) && 
                                        STATUS_OPTIONS.map(status => {
                                          const count = chain.tieIns.filter(t => t.status === status).length;
                                          if (count === 0) return null;
                                          
                                          return (
                                            <span 
                                              key={status} 
                                              className="inline-flex items-center text-xs px-2 py-1 rounded-full"
                                              style={{ 
                                                backgroundColor: `${STATUS_COLORS[status]}30`,
                                                color: darkMode ? '#fff' : '#000'
                                              }}
                                            >
                                              <span 
                                                className="w-2 h-2 rounded-full mr-1"
                                                style={{ backgroundColor: STATUS_COLORS[status] }}
                                              ></span>
                                              {count}
                                            </span>
                                          );
                                        })
                                      }
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Add Chain button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalMode('add');
                                  setEditingItem(null);
                                  setShowChainModal(true);
                                }}
                                className={`${
                                  darkMode 
                                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                                    : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-600'
                                } rounded-lg shadow-md p-4 border-2 border-dashed h-full min-h-[160px] flex flex-col items-center justify-center transition-colors`}
                              >
                                <Plus className="h-8 w-8 mb-2" />
                                <span className="font-medium">Add New Chain</span>
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  // Empty state when no projects exist
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 mb-6`}>
                    <EmptyState />
                  </div>
                )}
              </main>
              
              {/* Footer */}
              <footer className={`py-4 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'} mt-8`}>
                <div className="container mx-auto px-4 text-center text-sm">
                  <p>Project Network Tracker v2.0 | &copy; {new Date().getFullYear()} | Optimized for Better Performance</p>
                </div>
              </footer>
            </>
          )}
        </>
      )}
    </div>
  );
};

// CSS animations
const styles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
}

.animate-slideIn {
  animation: slideIn 0.3s ease-out;
}

@media print {
  header, footer, button, .no-print {
    display: none !important;
  }
  
  body, html {
    background-color: white !important;
  }
  
  .print-content {
    padding: 0 !important;
    margin: 0 !important;
  }
}
`;

// Add styles to the document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

export default ProjectNetworkTracker;
                                     