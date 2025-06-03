import { MessageSquare, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

const AuthImagePattern = ({ title, subtitle }) => {
  const icons = [
    <MessageSquare className="w-6 h-6 text-primary" strokeWidth={2} />,
    <Mail className="w-6 h-6 text-primary" strokeWidth={2} />,
    <Lock className="w-6 h-6 text-primary" strokeWidth={2} />,
    <Eye className="w-6 h-6 text-primary" strokeWidth={2} />,
    <EyeOff className="w-6 h-6 text-primary" strokeWidth={2} />,
    <Loader2 className="w-6 h-6 text-primary" strokeWidth={2} />,
    <MessageSquare className="w-6 h-6 text-primary" strokeWidth={2} />,
    <Mail className="w-6 h-6 text-primary" strokeWidth={2} />,
    <Lock className="w-6 h-6 text-primary" strokeWidth={2} />,
  ];

  return (
    <div className="hidden lg:flex items-center justify-center bg-base-200 p-12">
      <div className="max-w-md text-center">
        <div className="grid grid-cols-3 gap-3 mb-8">
          {icons.map((icon, i) => (
            <div
              key={i}
              className={`aspect-square rounded-2xl bg-primary/10 flex items-center justify-center ${
                i % 2 === 0 ? "animate-pulse" : ""
              }`}
            >
              {icon}
            </div>
          ))}
        </div>
        <h2 className="text-2xl font-bold mb-4 text-base-content">{title}</h2>
        <p className="text-base-content/60">{subtitle}</p>
      </div>
    </div>
  );
};

export default AuthImagePattern;
