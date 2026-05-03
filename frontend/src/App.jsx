import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  FileSignature,
  CheckCircle,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  Loader2,
  User,
  Plus,
  Trash2,
  Info,
  Phone,
  Home,
  X,
  Shield,
  Check,
} from "lucide-react";

// Use the environment variable if it exists, otherwise fall back to localhost
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

/* --- TOAST COMPONENT --- */
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[100] flex items-center p-4 mb-4 text-white rounded-lg shadow-lg transition-all duration-300 animate-in slide-in-from-right ${
        bgColors[type] || "bg-gray-800"
      }`}
    >
      <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-white/20">
        {type === "success" ? (
          <Check className="w-5 h-5" />
        ) : (
          <Shield className="w-5 h-5" />
        )}
      </div>
      <div className="ml-3 text-sm font-normal">{message}</div>
      <button
        onClick={onClose}
        className="ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-white/10 inline-flex h-8 w-8 text-white"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState("loading");
  const [token, setToken] = useState(null);
  const [orderData, setOrderData] = useState(null);

  // Global Toast State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Set Title and Favicon
  useEffect(() => {
    document.title = "Prime Move Logistics LLC";
    const link =
      document.querySelector("link[rel*='icon']") ||
      document.createElement("link");
    link.type = "image/png";
    link.rel = "shortcut icon";
    link.href = "/logo.png";
    document.getElementsByTagName("head")[0].appendChild(link);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");

    if (urlToken) {
      setToken(urlToken);
      verifyToken(urlToken);
    } else {
      setView("admin");
    }
  }, []);

  const verifyToken = async (tokenToVerify) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/verify-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToVerify }),
      });
      const data = await res.json();
      if (data.success) {
        setOrderData(data.data);
        setView("customer");
      } else {
        alert("Link Expired or Invalid");
        setView("admin");
      }
    } catch (err) {
      setView("admin");
    }
  };

  if (view === "loading")
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin w-12 h-12 text-amber-500" />
      </div>
    );
  if (view === "success") return <SuccessView />;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-amber-200 relative">
      {/* Render Toast if active */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <nav className="bg-[#0f4c81] text-white p-4 shadow-xl sticky top-0 z-50 border-b-4 border-amber-500">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-lg shadow-lg">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
                Prime Move Logistics LLC
              </h1>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-xs text-slate-300">
              410 FOUR SEASONS TOWN CTR GREENSBORO, NC 27407
            </p>
            <p className="text-sm font-bold text-amber-400">(321) 222-3188</p>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 py-8">
        {view === "admin" ? (
          <AdminForm showToast={showToast} />
        ) : (
          <CustomerSignView
            data={orderData}
            token={token}
            onSuccess={() => setView("success")}
          />
        )}
      </main>

      <footer className="text-center text-xs text-slate-400 py-6">
        © 2024 PRIME MOVE LOGISTICS LLC. All rights reserved.
      </footer>
    </div>
  );
}

/* --- ADMIN FORM --- */
function AdminForm({ showToast }) {
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);

  // Initial state for a single vehicle
  const initialVehicle = {
    year: "",
    make: "",
    model: "",
    type: "Car",
    condition: "Operable",
    price: "", // Specific price per vehicle
    deposit: "", // Specific deposit per vehicle
  };

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    carrierType: "Open",
    pickupDate: "",
    deliveryDate: "",
    // Origin
    pickupStreet: "", // Added Street
    pickupCity: "",
    pickupState: "",
    pickupZip: "",
    // Destination
    dropStreet: "", // Added Street
    dropCity: "",
    dropState: "",
    dropZip: "",
  });

  const [vehicles, setVehicles] = useState([initialVehicle]);

  // Calculated Totals
  const totalTariff = vehicles.reduce(
    (acc, v) => acc + (parseFloat(v.price) || 0),
    0,
  );
  const totalDeposit = vehicles.reduce(
    (acc, v) => acc + (parseFloat(v.deposit) || 0),
    0,
  );
  const totalCOD = totalTariff - totalDeposit;

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleVehicleChange = (index, field, value) => {
    const updatedVehicles = [...vehicles];
    updatedVehicles[index][field] = value;
    setVehicles(updatedVehicles);
  };

  const addVehicle = () => {
    setVehicles([...vehicles, { ...initialVehicle }]);
  };

  const removeVehicle = (index) => {
    if (vehicles.length > 1) {
      const updatedVehicles = vehicles.filter((_, i) => i !== index);
      setVehicles(updatedVehicles);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGeneratedLink(null);

    // Combine data
    const payload = {
      ...formData,
      vehicles: vehicles,
      totalPrice: totalTariff,
      firstPayment: totalDeposit,
      codPayment: totalCOD,
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/generate-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedLink(data.link);
        showToast("Order generated successfully!", "success");
      } else {
        showToast("Error: " + data.error, "error");
      }
    } catch (err) {
      showToast("Server Error: Check backend connection", "error");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      <div className="bg-[#0f4c81] p-8 text-white">
        <h2 className="text-3xl font-bold">New Dispatch Order</h2>
        <p className="text-slate-300 mt-1">
          Enter full details including addresses and vehicle pricing.
        </p>
      </div>

      <div className="p-8">
        {generatedLink && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="text-green-600" />{" "}
              <span className="font-bold text-green-800">Link Generated!</span>
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={generatedLink}
                className="flex-1 bg-white border border-green-300 rounded px-3 py-2 text-sm font-mono"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedLink);
                  showToast("Link copied to clipboard", "info");
                }}
                className="bg-green-600 text-white px-4 rounded font-bold hover:bg-green-700"
              >
                Copy
              </button>
              <a
                href={generatedLink}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-800 text-white px-4 py-2 rounded font-bold"
              >
                Open
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Info */}
          <section className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-800 uppercase mb-4 flex items-center gap-2">
              <User size={20} /> Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Customer Name"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                required
              />
              <Input
                label="Email"
                name="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={handleChange}
                required
              />
              <Input
                label="Phone"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
              />
              <div className="w-full">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Carrier Type
                </label>
                <select
                  name="carrierType"
                  onChange={handleChange}
                  value={formData.carrierType}
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm font-medium"
                >
                  <option value="Open">Open</option>
                  <option value="Enclosed">Enclosed</option>
                </select>
              </div>
            </div>
          </section>

          {/* Locations - Now includes Street Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Origin */}
            <div className="bg-emerald-50/50 p-6 rounded-xl border border-emerald-200">
              <h3 className="font-bold text-emerald-800 uppercase mb-4 flex items-center gap-2">
                <MapPin size={20} /> Origin (Pickup)
              </h3>
              <div className="space-y-4">
                <Input
                  label="Street Address"
                  name="pickupStreet"
                  value={formData.pickupStreet}
                  onChange={handleChange}
                  required
                  placeholder="123 Main St"
                />
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-3">
                    <Input
                      label="City"
                      name="pickupCity"
                      value={formData.pickupCity}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      label="State"
                      name="pickupState"
                      value={formData.pickupState}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Zip"
                      name="pickupZip"
                      value={formData.pickupZip}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <Input
                  label="Date"
                  type="date"
                  name="pickupDate"
                  value={formData.pickupDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Destination */}
            <div className="bg-red-50/50 p-6 rounded-xl border border-red-200">
              <h3 className="font-bold text-red-800 uppercase mb-4 flex items-center gap-2">
                <Home size={20} /> Destination (Delivery)
              </h3>
              <div className="space-y-4">
                <Input
                  label="Street Address"
                  name="dropStreet"
                  value={formData.dropStreet}
                  onChange={handleChange}
                  required
                  placeholder="456 Elm Ave"
                />
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-3">
                    <Input
                      label="City"
                      name="dropCity"
                      value={formData.dropCity}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      label="State"
                      name="dropState"
                      value={formData.dropState}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Zip"
                      name="dropZip"
                      value={formData.dropZip}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <Input
                  label="Est. Delivery"
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Vehicles Section - Multiple Vehicles */}
          <section className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 uppercase flex items-center gap-2">
                <Truck size={20} /> Vehicles & Pricing
              </h3>
              <button
                type="button"
                onClick={addVehicle}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-md font-bold flex items-center gap-1"
              >
                <Plus size={14} /> Add Vehicle
              </button>
            </div>

            <div className="space-y-4">
              {vehicles.map((vehicle, index) => (
                <div
                  key={index}
                  className="bg-white p-4 rounded-lg border border-slate-300 relative"
                >
                  {vehicles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVehicle(index)}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">
                    Vehicle #{index + 1}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                    <Input
                      placeholder="Year"
                      value={vehicle.year}
                      onChange={(e) =>
                        handleVehicleChange(index, "year", e.target.value)
                      }
                    />
                    <div className="col-span-2">
                      <Input
                        placeholder="Make"
                        value={vehicle.make}
                        onChange={(e) =>
                          handleVehicleChange(index, "make", e.target.value)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="Model"
                        value={vehicle.model}
                        onChange={(e) =>
                          handleVehicleChange(index, "model", e.target.value)
                        }
                      />
                    </div>
                    <div className="md:col-span-1">
                      <select
                        value={vehicle.type}
                        onChange={(e) =>
                          handleVehicleChange(index, "type", e.target.value)
                        }
                        className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm font-medium"
                      >
                        <option>Car</option>
                        <option>SUV</option>
                        <option>Pickup</option>
                        <option>Van</option>
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <select
                        value={vehicle.condition}
                        onChange={(e) =>
                          handleVehicleChange(
                            index,
                            "condition",
                            e.target.value,
                          )
                        }
                        className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm font-medium"
                      >
                        <option>Operable</option>
                        <option>Inoperable</option>
                      </select>
                    </div>
                  </div>
                  {/* Specific Pricing for this vehicle */}
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100">
                    <Input
                      label="Tariff ($)"
                      type="number"
                      value={vehicle.price}
                      onChange={(e) =>
                        handleVehicleChange(index, "price", e.target.value)
                      }
                      className="border-green-200 bg-green-50"
                    />
                    <Input
                      label="Deposit ($)"
                      type="number"
                      value={vehicle.deposit}
                      onChange={(e) =>
                        handleVehicleChange(index, "deposit", e.target.value)
                      }
                      className="border-blue-200 bg-blue-50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Calculated Totals - Read Only */}
          <section className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800">
            <h3 className="font-bold text-amber-500 uppercase mb-4 flex items-center gap-2">
              <DollarSign size={20} /> Order Totals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Total Tariff
                </label>
                <div className="text-2xl font-bold">${totalTariff}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Total Deposit (Credit Card)
                </label>
                <div className="text-2xl font-bold text-blue-300">
                  ${totalDeposit}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Balance / COD
                </label>
                <div className="text-2xl font-bold text-green-400">
                  ${totalCOD}
                </div>
              </div>
            </div>
          </section>

          <button
            disabled={loading}
            className="w-full bg-[#0f4c81] hover:bg-[#0b3d6b] text-white font-bold py-5 rounded-xl shadow-lg flex justify-center items-center gap-3 text-lg"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
            {loading ? "Processing..." : "Generate Order"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* --- CUSTOMER SIGN VIEW --- */
function CustomerSignView({ data, token, onSuccess }) {
  const [signedName, setSignedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Simplified Customer Input States (Just Contact Info)
  const [pickupDetails, setPickupDetails] = useState({
    name: "",
    phone: "",
    instructions: "",
  });
  const [dropDetails, setDropDetails] = useState({
    name: "",
    phone: "",
    instructions: "",
  });

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const startDraw = (e) => {
    if (e.type !== "mousedown") {
    }
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  };
  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const stopDraw = () => {
    isDrawing.current = false;
  };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleFinalize = async () => {
    // Validation
    if (!pickupDetails.name || !pickupDetails.phone)
      return alert("Please complete Pickup Contact info.");
    if (!dropDetails.name || !dropDetails.phone)
      return alert("Please complete Delivery Contact info.");
    if (!signedName || !agreed)
      return alert("Please type your name and agree to terms.");

    setLoading(true);

    const ipRes = await fetch("https://api.ipify.org?format=json").catch(
      () => ({ json: () => ({ ip: "127.0.0.1" }) }),
    );
    const ipData = await ipRes.json();
    const signatureImage = canvasRef.current.toDataURL("image/png");

    const payload = {
      token,
      signedName,
      signatureImage,
      ipAddress: ipData.ip || "Unknown",
      // Pass the Contact fields
      pickupContactName: pickupDetails.name,
      pickupPhone: pickupDetails.phone,
      pickupInstructions: pickupDetails.instructions,
      dropContactName: dropDetails.name,
      dropPhone: dropDetails.phone,
      dropInstructions: dropDetails.instructions,
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/finalize-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        if (result.emailSent === false) {
          alert(
            `Order was submitted, but email was not sent: ${result.emailError || "SMTP failed"}`,
          );
        }
        onSuccess();
      } else {
        alert(`Error submitting: ${result.error || "Unknown error"}`);
      }
    } catch (err) {
      alert("Failed to submit.");
    }
    setLoading(false);
  };

  // Helper to handle legacy data vs new array data for vehicles
  const vehiclesList = data.vehicles || [
    {
      year: data.vehicleYear,
      make: data.vehicleMake,
      model: data.vehicleModel,
      condition: data.vehicleCondition,
      price: data.totalPrice, // Fallback
      deposit: data.firstPayment, // Fallback
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
      <div className="bg-[#0f4c81] p-6 text-white text-center border-b-4 border-amber-500">
        <h2 className="text-2xl font-bold uppercase tracking-wide">
          Review & Sign Order
        </h2>
        <p className="text-slate-300 text-sm">Order #: {data.orderNumber}</p>
      </div>

      <div className="p-4 md:p-8 space-y-8 bg-slate-50">
        {/* Order Summary Box */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-[#0f4c81] uppercase mb-4 border-b pb-2">
            Order Summary
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">
                Customer
              </p>
              <p className="font-medium text-lg">{data.customerName}</p>
              <p className="text-sm text-slate-600">{data.customerEmail}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">
                Transport Type
              </p>
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full ${
                  data.carrierType === "Enclosed"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {data.carrierType || "Open"}
              </span>
            </div>
          </div>

          <h4 className="font-bold text-slate-700 uppercase text-xs mb-2">
            Vehicles
          </h4>
          <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
            {vehiclesList.map((v, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0"
              >
                <div>
                  <span className="font-bold">
                    {v.year} {v.make} {v.model}
                  </span>
                  <span className="text-xs ml-2 text-slate-500">
                    ({v.condition})
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">${v.price}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 border-t pt-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase">Total Tariff</p>
              <p className="font-bold text-xl">${data.totalPrice}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase">Deposit</p>
              <p className="font-bold text-xl text-blue-600">
                ${data.firstPayment}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase">COD</p>
              <p className="font-bold text-xl text-green-600">
                ${data.codPayment}
              </p>
            </div>
          </div>
        </div>

        {/* --- CUSTOMER INPUT SECTIONS --- */}

        {/* Pickup Details - READ ONLY ADDRESS */}
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-6">
          <h3 className="text-lg font-bold text-emerald-800 uppercase mb-4 flex items-center gap-2">
            <MapPin size={20} /> Pickup Location
          </h3>
          <div className="mb-4 bg-white p-4 rounded-lg border border-emerald-200 shadow-sm">
            <div className="text-emerald-900 font-bold text-lg">
              {data.pickupStreet}
            </div>
            <div className="text-emerald-800">
              {data.pickupCity}, {data.pickupState} {data.pickupZip}
            </div>
            <div className="text-xs text-emerald-600 mt-1 uppercase font-bold">
              Date: {data.pickupDate}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-bold text-emerald-800 uppercase">
              Who should the carrier contact at pickup?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Contact Name *"
                placeholder="Person at pickup"
                value={pickupDetails.name}
                onChange={(e) =>
                  setPickupDetails({ ...pickupDetails, name: e.target.value })
                }
              />
              <Input
                label="Contact Phone *"
                placeholder="(555) 555-5555"
                value={pickupDetails.phone}
                onChange={(e) =>
                  setPickupDetails({ ...pickupDetails, phone: e.target.value })
                }
              />
            </div>
            <Input
              label="Notes (Gate code, etc)"
              value={pickupDetails.instructions}
              onChange={(e) =>
                setPickupDetails({
                  ...pickupDetails,
                  instructions: e.target.value,
                })
              }
            />
          </div>
        </div>

        {/* Delivery Details - READ ONLY ADDRESS */}
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
          <h3 className="text-lg font-bold text-blue-800 uppercase mb-4 flex items-center gap-2">
            <Home size={20} /> Delivery Location
          </h3>
          <div className="mb-4 bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
            <div className="text-blue-900 font-bold text-lg">
              {data.dropStreet}
            </div>
            <div className="text-blue-800">
              {data.dropCity}, {data.dropState} {data.dropZip}
            </div>
            <div className="text-xs text-blue-600 mt-1 uppercase font-bold">
              Est. Delivery: {data.deliveryDate}
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-sm font-bold text-blue-800 uppercase">
              Who should the carrier contact at delivery?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Contact Name *"
                placeholder="Person at delivery"
                value={dropDetails.name}
                onChange={(e) =>
                  setDropDetails({ ...dropDetails, name: e.target.value })
                }
              />
              <Input
                label="Contact Phone *"
                placeholder="(555) 555-5555"
                value={dropDetails.phone}
                onChange={(e) =>
                  setDropDetails({ ...dropDetails, phone: e.target.value })
                }
              />
            </div>
            <Input
              label="Notes (Parking, etc)"
              value={dropDetails.instructions}
              onChange={(e) =>
                setDropDetails({ ...dropDetails, instructions: e.target.value })
              }
            />
          </div>
        </div>

        {/* Terms & Conditions Box */}
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
          <h3 className="font-bold text-slate-800 uppercase mb-2">
            Terms and Conditions
          </h3>
          <div className="h-48 overflow-y-auto bg-white border border-slate-300 rounded-lg p-4 text-xs text-slate-700 leading-relaxed shadow-inner">
            <p>
              1. <strong>Payment</strong>: Payment terms are as specified in the
              quote. Customer agrees to pay according to the payment schedule
              provided.
            </p>
            <p>
              2. <strong>Vehicle Condition</strong>:Vehicle must be in operable
              condition and ready for pickup at the specified location and time.
            </p>
            <p>
              3. <strong>Personal Items</strong>: Customer is responsible for
              removing all personal items from the vehicle. PRIME MOVE LOGISTICS
              LLC is not responsible for any items left in the vehicle on the
              dropoff.
            </p>
            <p>
              4. <strong>Delivery Timeframe</strong>: Delivery timeframes are
              estimates based on distance and weather conditions. While we
              strive for on-time delivery, exact dates cannot be guaranteed.
            </p>
            <p>
              5. <strong>Vehicle Inspection</strong>: Customer must inspect
              vehicle upon delivery and report any issues immediately. Any
              damage claims must be noted on the Bill of Lading at time of
              delivery.
            </p>
            <p>
              6. <strong>Mechanical Issues</strong>: PRIME MOVE LOGISTICS LLC is
              not responsible for mechanical failures, battery issues, or
              pre-existing damage during transport.
            </p>
            <p>
              7. <strong>Contact Information</strong>: Customer agrees to
              provide accurate contact information and be available for
              communication during pickup and delivery.
            </p>
            <p>
              8. <strong>Cancellation</strong>: Cancellations must be made in
              writing. Cancellation fees may apply as per our cancellation
              policy.
            </p>
            <p>
              9. <strong>Insurance</strong>: Basic carrier liability insurance
              is included. Additional insurance options are available upon
              request.
            </p>
            <p>
              10. <strong>Legal Agreement</strong>: This electronic signature
              constitutes a legally binding agreement between the customer and
              PRIME MOVE LOGISTICS LLC.
            </p>
          </div>
        </div>

        {/* Signature Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-[#0f4c81] uppercase mb-4 border-b pb-2">
            Digital Signature
          </h3>

          <div className="flex items-start gap-3 mb-6 bg-slate-50 p-4 rounded border border-slate-200">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 accent-amber-600 cursor-pointer"
            />
            <p className="text-sm text-slate-700">
              I agree to the terms and authorize transport of the vehicles
              listed above.
            </p>
          </div>

          <div className="space-y-6">
            <Input
              label="Type Full Name (Electronic Signature) *"
              value={signedName}
              onChange={(e) => setSignedName(e.target.value)}
            />

            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">
                  Draw Signature <span className="text-red-500">*</span>
                </label>
                <button
                  onClick={clearCanvas}
                  className="text-xs text-red-500 font-bold underline hover:text-red-700"
                >
                  Clear
                </button>
              </div>
              <div className="border border-slate-300 rounded bg-white h-48 relative touch-none shadow-inner">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full cursor-crosshair block"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10">
                  <span className="text-4xl font-serif italic text-slate-900">
                    Sign Here
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleFinalize}
          disabled={loading}
          className="w-full bg-[#0f4c81] hover:bg-[#0b3d6b] text-white font-bold py-5 rounded-xl shadow-lg flex justify-center items-center gap-2 text-lg transform transition-all active:scale-95"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <FileSignature size={24} />
          )}
          {loading ? "Submitting..." : "Sign & Submit Order"}
        </button>
      </div>
    </div>
  );
}

function SuccessView() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-100">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-200 animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Order Completed
        </h1>
        <p className="text-slate-500 mb-8 text-lg font-medium">
          PDF has been sent to you and also to Prime Move Logistics LLC
        </p>
        <button
          onClick={() => (window.location.href = "/")}
          className="w-full bg-[#0f4c81] text-white font-bold py-3 rounded-lg hover:bg-[#0b3d6b]"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Input({ label, type = "text", className = "", ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <input
        type={type}
        className={`w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm font-medium focus:ring-2 focus:ring-[#0f4c81] outline-none transition-all placeholder:text-slate-400 shadow-sm ${className}`}
        {...props}
      />
    </div>
  );
}
