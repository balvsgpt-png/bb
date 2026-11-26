export interface SampleDictation {
  id: string;
  label: string;
  category: string;
  patientName: string;
  examHint: string;
  contrastHint: string;
  audioDescription: string;
  spokenText: string;
  // Synthetic base64 audio will be generated or mocked via Web Audio API synthesizer
}

export const SAMPLE_DICTATIONS: SampleDictation[] = [
  {
    id: 'sample-abdome-numeros',
    label: 'Abdome Total COM Contraste (Ditação de Números: 1 2 3 4 5 7 8)',
    category: 'Tomografia de Abdome',
    patientName: 'João Carlos da Silva',
    examHint: 'TOMOGRAFIA DE ABDOME TOTAL',
    contrastHint: 'COM CONTRASTE',
    audioDescription: 'Ditação padrão de Abdome Total onde o médico dita a sequência numérica dos achados normais (1, 2, 3, 4, 5, 7, 8) e a opinião.',
    spokenText: 'Paciente João Carlos da Silva. Tomografia de abdome total, com contraste. O conjunto. 1 2 3 4 5 7 8. Ponto parágrafo. Opinião. Tomografia de abdome sem alterações significativas. Ponto final.',
  },
  {
    id: 'sample-torax-com',
    label: 'Tórax COM Contraste (Números + Achado Patológico Aórtico)',
    category: 'Tomografia de Tórax',
    patientName: 'Maria de Lourdes Oliveira',
    examHint: 'TOMOGRAFIA DE TÓRAX',
    contrastHint: 'COM CONTRASTE',
    audioDescription: 'Ditação mista: usa frases normais 1 e 2 da máscara, substitui a frase 3 por achado aórtico específico e inclui opinião customizada.',
    spokenText: 'Paciente Maria de Lourdes Oliveira. Tomografia de tórax, com contraste. O conjunto. 1 2. Ponto parágrafo. Aorta torácica com ectasia difusa e placas parietais calcificadas, sem evidência de dissecção aguda. Ponto parágrafo. 4. Ponto parágrafo. Opinião. Ateromatose e ectasia da aorta torácica sem outros achados agudos. Ponto final.',
  },
  {
    id: 'sample-cranio-sem',
    label: 'Crânio SEM Contraste (Normal Completo 1 2 3 4)',
    category: 'Tomografia de Crânio',
    patientName: 'Roberto Almeida',
    examHint: 'TOMOGRAFIA DE CRÂNIO',
    contrastHint: 'SEM CONTRASTE',
    audioDescription: 'Ditação rápida de crânio sem contraste em urgência, referenciando as 4 frases normais do PDF.',
    spokenText: 'Paciente Roberto Almeida. Tomografia de crânio, sem contraste. O conjunto. 1 2 3 4. Ponto parágrafo. Opinião. O exame demonstra tomografia de crânio sem alterações significativas. Ponto final.',
  },
  {
    id: 'sample-coluna-lombar',
    label: 'Coluna Lombar SEM Contraste (Osteófitos e Hérnia)',
    category: 'Tomografia de Coluna',
    patientName: 'Carlos Eduardo Santos',
    examHint: 'TOMOGRAFIA DE COLUNA LOMBAR',
    contrastHint: 'SEM CONTRASTE',
    audioDescription: 'Ditação de coluna lombar com identificação de discopatia degenerativa em L4-L5 e L5-S1.',
    spokenText: 'Paciente Carlos Eduardo Santos. Tomografia de coluna lombar, sem contraste. O conjunto. 1 2. Ponto parágrafo. Osteófitos marginais nos corpos vertebrais lombares com redução dos espaços discais de L4-L5 e L5-S1. Ponto parágrafo. 4 5. Ponto parágrafo. Protrusão discal póstero-lateral esquerda em L5-S1 tocando a raiz nervosa descendente homolateral. Ponto parágrafo. 7 8. Ponto parágrafo. Opinião. Espondilodiscoartrose lombar com protrusão discal L5-S1 associada a conflito radicular. Ponto final.',
  },
  {
    id: 'sample-angio-carotidas',
    label: 'Angio TC de Carótidas e Vertebrais COM Contraste',
    category: 'Angiotomografia',
    patientName: 'Dra. Denise Ferreira Rocha',
    examHint: 'ANGIOTOMOGRAFIA COMPUTADORIZADA DE CARÓTIDAS E VERTEBRAIS',
    contrastHint: 'COM CONTRASTE',
    audioDescription: 'Ditação angiográfica cervical com análise das artérias carótidas e vertebrais.',
    spokenText: 'Paciente Denise Ferreira Rocha. Angiotomografia computadorizada de carótidas e vertebrais, com contraste. O conjunto. Arco aórtico, tronco braquiocefálico e artérias subclávias com calibre e trajeto normais. Ponto parágrafo. Bulbo carotídeo direito com placa fibrocalcificada determinando estenose luminal menor que 30 por cento. Ponto parágrafo. Carótidas esquerdas e artérias vertebrais pérvias com fluxo habitual. Ponto parágrafo. Opinião. Ateromatose carotídea incipiente sem estenoses hemodinamicamente significativas. Ponto final.',
  },
  {
    id: 'sample-mastoides-sem',
    label: 'Tomografia de Mastóides SEM Contraste (Sequência 1 a 5)',
    category: 'Tomografia de Mastóides',
    patientName: 'Beatriz Vasconcelos',
    examHint: 'TOMOGRAFIA DE MASTÓIDES',
    contrastHint: 'SEM CONTRASTE',
    audioDescription: 'Ditação completa de mastóides utilizando a máscara com todas as 5 frases e técnica multislice de 128 detectores.',
    spokenText: 'Paciente Beatriz Vasconcelos. Tomografia de mastóides, sem contraste. O conjunto. 1 2 3 4 5. Ponto final.',
  },
];
